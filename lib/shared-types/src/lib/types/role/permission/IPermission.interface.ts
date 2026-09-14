import { Actions } from '../action/actions.enum';
import { Subjects } from '../subject/subjects.enum';
import { ICondition } from '../condition/ICondition.interface';

export interface IPermission {
  action: Actions;
  subject: Subjects;
  conditions?: ICondition | ICondition[];
}
