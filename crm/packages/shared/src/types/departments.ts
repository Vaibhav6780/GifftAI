export interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  managerName: string | null;
  userCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentChildRef {
  id: string;
  name: string;
}

export interface DepartmentDetail extends DepartmentNode {
  children: DepartmentChildRef[];
}
