package com.classi_fy.twa;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingProductId;

    private interface BillingConnectionCallback {
        void onReady();
        void onError(String message);
    }

    private BillingClient getOrCreateBillingClient() {
        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
                )
                .enableAutoServiceReconnection()
                .build();
        }
        return billingClient;
    }

    private void ensureConnection(BillingConnectionCallback callback) {
        BillingClient client = getOrCreateBillingClient();
        if (client.isReady()) {
            callback.onReady();
            return;
        }

        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    callback.onReady();
                    return;
                }
                callback.onError("Billing setup failed: " + billingResult.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Automatic reconnection is enabled.
            }
        });
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        ensureConnection(new BillingConnectionCallback() {
            @Override
            public void onReady() {
                JSObject response = new JSObject();
                response.put("ready", true);
                call.resolve(response);
            }

            @Override
            public void onError(String message) {
                call.reject(message);
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray productIdsArray = call.getArray("productIds");
        if (productIdsArray == null || productIdsArray.length() == 0) {
            call.reject("productIds is required");
            return;
        }

        List<QueryProductDetailsParams.Product> queryProducts = new ArrayList<>();
        for (int i = 0; i < productIdsArray.length(); i++) {
            String productId = productIdsArray.optString(i, "").trim();
            if (productId.isEmpty()) continue;

            queryProducts.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );
        }

        if (queryProducts.isEmpty()) {
            call.reject("No valid productIds provided");
            return;
        }

        ensureConnection(new BillingConnectionCallback() {
            @Override
            public void onReady() {
                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(queryProducts)
                    .build();

                getOrCreateBillingClient().queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Failed to query products: " + billingResult.getDebugMessage());
                        return;
                    }

                    List<ProductDetails> detailsList = productDetailsResult.getProductDetailsList();
                    JSArray products = new JSArray();

                    if (detailsList != null) {
                        for (ProductDetails details : detailsList) {
                            JSObject row = new JSObject();
                            row.put("productId", details.getProductId());
                            row.put("title", details.getTitle());
                            row.put("description", details.getDescription());

                            String formattedPrice = extractFormattedPrice(details);
                            if (!formattedPrice.isEmpty()) {
                                row.put("formattedPrice", formattedPrice);
                            }

                            String priceCurrencyCode = extractPriceCurrencyCode(details);
                            if (!priceCurrencyCode.isEmpty()) {
                                row.put("priceCurrencyCode", priceCurrencyCode);
                            }

                            long priceMicros = extractPriceAmountMicros(details);
                            if (priceMicros > 0) {
                                row.put("priceAmountMicros", priceMicros);
                            }

                            products.put(row);
                        }
                    }

                    JSObject response = new JSObject();
                    response.put("products", products);
                    call.resolve(response);
                });
            }

            @Override
            public void onError(String message) {
                call.reject(message);
            }
        });
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        String productId = call.getString("productId", "").trim();
        String accountObfuscationId = call.getString("accountObfuscationId", "").trim();

        if (productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }

        ensureConnection(new BillingConnectionCallback() {
            @Override
            public void onReady() {
                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(Collections.singletonList(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(productId)
                            .setProductType(BillingClient.ProductType.INAPP)
                            .build()
                    ))
                    .build();

                getOrCreateBillingClient().queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Failed to load product: " + billingResult.getDebugMessage());
                        return;
                    }

                    List<ProductDetails> productDetailsList = productDetailsResult.getProductDetailsList();
                    if (productDetailsList == null || productDetailsList.isEmpty()) {
                        call.reject("Product is not available on Google Play");
                        return;
                    }

                    ProductDetails productDetails = productDetailsList.get(0);

                    BillingFlowParams.ProductDetailsParams.Builder productParamsBuilder =
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails);

                    String offerToken = extractOfferToken(productDetails);
                    if (!offerToken.isEmpty()) {
                        productParamsBuilder.setOfferToken(offerToken);
                    }

                    BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(productParamsBuilder.build()));

                    if (!accountObfuscationId.isEmpty()) {
                        flowBuilder.setObfuscatedAccountId(accountObfuscationId);
                    }

                    Activity activity = getActivity();
                    if (activity == null) {
                        call.reject("Activity is unavailable");
                        return;
                    }

                    BillingResult launchResult = getOrCreateBillingClient().launchBillingFlow(activity, flowBuilder.build());
                    if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Failed to launch billing flow: " + launchResult.getDebugMessage());
                        return;
                    }

                    pendingPurchaseCall = call;
                    pendingProductId = productId;
                });
            }

            @Override
            public void onError(String message) {
                call.reject(message);
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) {
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPendingPurchase("Purchase canceled by user");
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectPendingPurchase("Purchase failed: " + billingResult.getDebugMessage());
            return;
        }

        if (purchases == null || purchases.isEmpty()) {
            rejectPendingPurchase("Purchase failed: empty purchase result");
            return;
        }

        Purchase selected = purchases.get(0);
        if (pendingProductId != null && !pendingProductId.isEmpty()) {
            for (Purchase purchase : purchases) {
                List<String> productIds = purchase.getProducts();
                if (productIds != null && productIds.contains(pendingProductId)) {
                    selected = purchase;
                    break;
                }
            }
        }

        JSObject response = new JSObject();
        List<String> productIds = selected.getProducts();
        response.put("productId", productIds != null && !productIds.isEmpty() ? productIds.get(0) : pendingProductId);
        response.put("purchaseToken", selected.getPurchaseToken());
        response.put("orderId", selected.getOrderId());
        response.put("purchaseState", selected.getPurchaseState());
        response.put("isAcknowledged", selected.isAcknowledged());
        response.put("purchaseTime", String.valueOf(selected.getPurchaseTime()));
        response.put("originalJson", selected.getOriginalJson());
        response.put("signature", selected.getSignature());
        response.put("packageName", getPackageNameFromPurchase(selected));

        resolvePendingPurchase(response);
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }
        super.handleOnDestroy();
    }

    private void resolvePendingPurchase(JSObject payload) {
        if (pendingPurchaseCall == null) {
            return;
        }

        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        pendingProductId = null;
        call.resolve(payload);
    }

    private void rejectPendingPurchase(String message) {
        if (pendingPurchaseCall == null) {
            return;
        }

        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        pendingProductId = null;
        call.reject(message);
    }

    private String extractOfferToken(ProductDetails details) {
        try {
            Method method = ProductDetails.class.getMethod("getOneTimePurchaseOfferDetailsList");
            Object value = method.invoke(details);
            if (value instanceof List) {
                List<?> list = (List<?>) value;
                if (!list.isEmpty() && list.get(0) != null) {
                    Method tokenMethod = list.get(0).getClass().getMethod("getOfferToken");
                    Object tokenValue = tokenMethod.invoke(list.get(0));
                    return tokenValue == null ? "" : String.valueOf(tokenValue);
                }
            }
        } catch (Exception ignored) {
        }

        return "";
    }

    private String extractFormattedPrice(ProductDetails details) {
        Object offerDetails = extractOneTimeOfferDetails(details);
        if (offerDetails == null) return "";

        try {
            Method method = offerDetails.getClass().getMethod("getFormattedPrice");
            Object value = method.invoke(offerDetails);
            return value == null ? "" : String.valueOf(value);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String extractPriceCurrencyCode(ProductDetails details) {
        Object offerDetails = extractOneTimeOfferDetails(details);
        if (offerDetails == null) return "";

        try {
            Method method = offerDetails.getClass().getMethod("getPriceCurrencyCode");
            Object value = method.invoke(offerDetails);
            return value == null ? "" : String.valueOf(value);
        } catch (Exception ignored) {
            return "";
        }
    }

    private long extractPriceAmountMicros(ProductDetails details) {
        Object offerDetails = extractOneTimeOfferDetails(details);
        if (offerDetails == null) return 0;

        try {
            Method method = offerDetails.getClass().getMethod("getPriceAmountMicros");
            Object value = method.invoke(offerDetails);
            if (value instanceof Number) {
                return ((Number) value).longValue();
            }
        } catch (Exception ignored) {
        }

        return 0;
    }

    private Object extractOneTimeOfferDetails(ProductDetails details) {
        try {
            Method method = ProductDetails.class.getMethod("getOneTimePurchaseOfferDetails");
            Object value = method.invoke(details);
            if (value != null) return value;
        } catch (Exception ignored) {
        }

        try {
            Method method = ProductDetails.class.getMethod("getOneTimePurchaseOfferDetailsList");
            Object value = method.invoke(details);
            if (value instanceof List) {
                List<?> list = (List<?>) value;
                if (!list.isEmpty()) {
                    return list.get(0);
                }
            }
        } catch (Exception ignored) {
        }

        return null;
    }

    private String getPackageNameFromPurchase(Purchase purchase) {
        try {
            Method method = Purchase.class.getMethod("getPackageName");
            Object value = method.invoke(purchase);
            if (value != null) {
                return String.valueOf(value);
            }
        } catch (Exception ignored) {
        }

        return getContext().getPackageName();
    }
}
