import { ChildStore } from "@/pages/ChildStore";

export const ParentStore = (): JSX.Element => {
  return <ChildStore parentMode />;
};

export default ParentStore;
