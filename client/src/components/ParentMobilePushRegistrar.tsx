import { MobilePushRegistrar } from "@/components/MobilePushRegistrar";

export function ParentMobilePushRegistrar() {
  return (
    <MobilePushRegistrar
      tokenStorageKey="token"
      apiSubscriptionEndpoint="/api/parent/push-subscriptions"
      role="parent"
    />
  );
}

export default ParentMobilePushRegistrar;
