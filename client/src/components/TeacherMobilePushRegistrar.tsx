import { MobilePushRegistrar } from "@/components/MobilePushRegistrar";

export function TeacherMobilePushRegistrar() {
  return (
    <MobilePushRegistrar
      tokenStorageKey="teacherToken"
      apiSubscriptionEndpoint="/api/teacher/push-subscriptions"
      role="teacher"
    />
  );
}

export default TeacherMobilePushRegistrar;
