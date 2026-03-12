export interface Teacher {
  id: number;
  nameGV: string;
  phoneNumber: string;
  Mon_day: string;
  school: string;
  idclass: string;
  idGV: string;
  pass: string;
  percent: number;
  income1: number;
  income2: number;
}

export interface Student {
  id: number;
  nameHS: string;
  idHS: string;
  class: string;
  school: string;
  idclass: string;
  hocphi: number;
  diemdanh1?: string;
  diemdanh2?: string;
  diemdanh3?: string;
  diemdanh4?: string;
  diemdanh5?: string;
  diemdanh6?: string;
  diemdanh7?: string;
  diemdanh8?: string;
  diemdanh9?: string;
  diemdanh10?: string;
  diemdanh11?: string;
  diemdanh12?: string;
  Tong: number;
  Tien: number;
}

export interface Bank {
  id: number;
  name: string;
  nameBank: string;
  SoTK: string;
  tkVietQR: string;
}

export interface ThuTien {
  id: number;
  idHS: string;
  idclass: string;
  sotien: number;
  noidungck: string;
  ghi_chu: string;
  maQR: string;
}

export type Role = "admin" | "teacher" | "student" | "parent";

export interface User {
  role: Role;
  name?: string;
  idGV?: string;
  idHS?: string;
  [key: string]: any;
}
