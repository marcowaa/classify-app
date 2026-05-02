import { MobilePushRegistrar } from "@/components/MobilePushRegistrar";

export function ChildMobilePushRegistrar() {
  return (
    <MobilePushRegistrar
      tokenStorageKey="childToken"
      apiSubscriptionEndpoint="/api/child/push-subscriptions"
      role="child"
    />
  );
}

export default ChildMobilePushRegistrar;
