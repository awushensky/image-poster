import type { ColorType } from "~/lib/color-utils";

export interface PostingSchedule {
  id: number;
  userDid: string;
  cronExpression: string;
  color: ColorType;
  active: boolean;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposedPostingSchedule extends Omit<PostingSchedule, 'id' | 'userDid' | 'lastExecuted' | 'createdAt' | 'updatedAt'> { }
