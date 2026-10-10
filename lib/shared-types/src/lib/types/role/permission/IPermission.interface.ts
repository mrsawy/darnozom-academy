import { Actions } from '../action/actions.enum';
import { ICondition } from '../condition/ICondition.interface';
import { Subjects } from '../subject/subjects.enum';

export interface IPermission {
  action: Actions;
  subject: Subjects;
  conditions?: ICondition[];
}
