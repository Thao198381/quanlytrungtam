import React, { useState, useEffect } from 'react';
import {Link_Admin} from '../config';
import { 
  User as UserIcon, 
  LogOut, 
  Upload, 
  Users, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit, 
  Plus, 
  Download, 
  QrCode,
  ChevronRight,
  Menu,
  X,
  Lock,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as xlsx from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Role, User, Teacher, Student, Bank, ThuTien } from './types';

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [bankInfo, setBankInfo] = useState<Bank[]>([]);
  const [thuTienList, setThuTienList] = useState<ThuTien[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [gasUrl, setGasUrl] = useState('');

  const handleSyncFromSheets = async () => {
    if (!gasUrl) return alert("Vui lòng nhập URL Google Apps Script");
    if (!window.confirm("Bạn có chắc chắn muốn tải dữ liệu từ Google Sheets về Web? Dữ liệu hiện tại trên Web sẽ bị ghi đè.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(Link_Admin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        alert("Đồng bộ từ Google Sheets thành công!");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Lỗi kết nối đồng bộ");
    } finally {
      setLoading(false);
    }
  };

  const handlePushToSheets = async () => {  

    setLoading(true);
    try {
      const syncData = [
        { name: 'dsgv', data: teachers },
        { name: 'dshs', data: students },
        { name: 'bank', data: bankInfo },
        { name: 'thutien', data: thuTienList }
      ];

      for (const item of syncData) {
        await fetch(Link_Admin, {
          method: 'POST',
          mode: 'no-cors', // GAS requires no-cors for simple posts or proper CORS headers
          body: JSON.stringify({
            action: 'sync_all',
            sheetName: item.name,
            data: item.data
          })
        });
      }
      alert("Yêu cầu đẩy dữ liệu đã được gửi! (Vui lòng kiểm tra Google Sheets sau vài giây)");
    } catch (err) {
      alert("Lỗi khi đẩy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [tRes, sRes, bRes, ttRes] = await Promise.all([
        fetch(Link_Admin, { method: 'POST', body: JSON.stringify({ action: 'get_teachers' }) }),
        fetch(Link_Admin, { method: 'POST', body: JSON.stringify({ action: 'get_students' }) }),
        fetch(Link_Admin, { method: 'POST', body: JSON.stringify({ action: 'get_bank' }) }),
        fetch(Link_Admin, { method: 'POST', body: JSON.stringify({ action: 'get_thutien' }) })
      ]);
      setTeachers(await tRes.json());
      setStudents(await sRes.json());
      setBankInfo(await bRes.json());
      setThuTienList(await ttRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(Link_Admin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setIsLoggedIn(true);
        if (data.user.role === 'admin' && password === 'admin') {
          setShowPasswordChange(true);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setRole(null);
    setUsername('');
    setPassword('');
  };

 const handlePasswordChange = async () => {
    if (!newPassword) return;
    
    // Thêm action và role vào body
    const body = user?.role === 'admin' 
      ? { action: 'change_password', newPassword, role: 'admin' } 
      : { action: 'change_password', idGV: user?.idGV, newPassword, role: 'teacher' };
    
    await fetch(Link_Admin, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    alert("Đổi mật khẩu thành công!");
    setShowPasswordChange(false);
  };

  const handleFileUpload = async (type: string, file: File, mode: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn upload file này (${mode === 'overwrite' ? 'Ghi đè' : 'Thêm mới'})?`)) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    
    setLoading(true);
    try {
      await fetch(Link_Admin, {
        method: 'POST',
        body: formData
      });
      fetchData();
      alert("Upload thành công!");
    } catch (err) {
      alert("Upload thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (idHS: string, idclass: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa học sinh này?")) return;
    await fetch(Link_Admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idHS, idclass, action: 'delete_student' })
    });
    fetchData();
  };

  const handleAttendance = async (idclass: string, attendanceData: any) => {
    await fetch(Link_Admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idclass, attendanceData })
    });
    fetchData();
    alert("Điểm danh thành công!");
  };

  const handleResetAttendance = async (idclass: string) => {
    if (!window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn Reset điểm danh của lớp này? Mọi dữ liệu sẽ bị xóa!")) return;
    await fetch(Link_Admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idclass })
    });
    fetchData();
  };

  const handleCalculateCollection = async () => {
    setLoading(true);
    await fetch(Link_Admin, { method: 'POST', body: JSON.stringify({ action: 'calculate_collection' }) });
    fetchData();
    setLoading(false);
    alert("Đã tính toán tiền thu đợt mới!");
  };

  const generateQR = (idHS: string, idclass: string, amount: number) => {
    const bank = bankInfo[0];
    if (!bank) return "";
    // VietQR format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
    const description = encodeURIComponent(`${idHS} ${idclass} chuyen tien hoc them`);
    return `https://img.vietqr.io/image/${bank.nameBank}-${bank.SoTK}-compact.png?amount=${amount}&addInfo=${description}&accountName=${encodeURIComponent(bank.name)}`;
  };

  const downloadPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
        >
          <h1 className="text-3xl font-serif italic text-center mb-8 text-stone-800">Tutoring Center</h1>
          
          <div className="grid grid-cols-2 gap-3 mb-8">
            {(['admin', 'teacher', 'student', 'parent'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  role === r 
                    ? 'bg-stone-800 text-white shadow-lg scale-105' 
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {role && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-stone-400 mb-1">Tài khoản / ID</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400"
                  required
                />
              </div>
              {role !== 'student' && role !== 'parent' && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-stone-400 mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400"
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-900 transition-colors shadow-lg disabled:opacity-50"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="bg-white border-bottom border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className={`text-xl font-serif italic ${user?.role === 'admin' ? 'shimmer-text font-bold' : 'text-stone-800'}`}>
              {user?.role === 'admin' ? 'Admin Panel' : `Chào, ${user?.name || user?.nameHS || user?.nameGV}`}
            </h2>
          </div>
          <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 pb-24">
        {/* Admin View */}
        {user?.role === 'admin' && (
          <div className="space-y-8">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['dashboard', 'teachers', 'students', 'bank', 'collection'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab ? 'bg-stone-800 text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-4">Kết nối Google Sheets</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono text-stone-400 uppercase mb-1">URL Google Apps Script</label>
                      <input 
                        type="text" 
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={gasUrl}
                        onChange={(e) => setGasUrl(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSyncFromSheets} className="flex-1 py-2 bg-stone-800 text-white rounded-xl text-[10px] font-medium flex items-center justify-center gap-1">
                        <Download size={12} /> Tải về Web
                      </button>
                      <button onClick={handlePushToSheets} className="flex-1 py-2 bg-stone-100 text-stone-800 rounded-xl text-[10px] font-medium flex items-center justify-center gap-1">
                        <Upload size={12} /> Đẩy lên Sheet
                      </button>
                    </div>
                    <p className="text-[9px] text-stone-400 italic">* Lưu ý: Cần thiết lập Apps Script trên Google Sheets trước khi kết nối.</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-4">Upload Dữ liệu Excel</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Danh sách Giáo viên (dsgv)</p>
                      <div className="flex gap-2">
                        <input type="file" id="up-gv" className="hidden" onChange={(e) => e.target.files && handleFileUpload('teachers', e.target.files[0], 'overwrite')} />
                        <button onClick={() => document.getElementById('up-gv')?.click()} className="flex-1 py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                          <Upload size={14} /> Ghi đè
                        </button>
                        <input type="file" id="up-gv-app" className="hidden" onChange={(e) => e.target.files && handleFileUpload('teachers', e.target.files[0], 'append')} />
                        <button onClick={() => document.getElementById('up-gv-app')?.click()} className="flex-1 py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                          <Plus size={14} /> Thêm mới
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Danh sách Học sinh (dshs)</p>
                      <div className="flex gap-2">
                        <input type="file" id="up-hs" className="hidden" onChange={(e) => e.target.files && handleFileUpload('students', e.target.files[0], 'overwrite')} />
                        <button onClick={() => document.getElementById('up-hs')?.click()} className="flex-1 py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                          <Upload size={14} /> Ghi đè
                        </button>
                        <input type="file" id="up-hs-app" className="hidden" onChange={(e) => e.target.files && handleFileUpload('students', e.target.files[0], 'append')} />
                        <button onClick={() => document.getElementById('up-hs-app')?.click()} className="flex-1 py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                          <Plus size={14} /> Thêm mới
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Thông tin Ngân hàng (bank)</p>
                      <input type="file" id="up-bank" className="hidden" onChange={(e) => e.target.files && handleFileUpload('bank', e.target.files[0], 'overwrite')} />
                      <button onClick={() => document.getElementById('up-bank')?.click()} className="w-full py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                        <Upload size={14} /> Upload Bank
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm md:col-span-2">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-4">Thống kê nhanh</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-xs text-stone-400">Tổng Giáo viên</p>
                      <p className="text-2xl font-serif">{teachers.length}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-xs text-stone-400">Tổng Học sinh</p>
                      <p className="text-2xl font-serif">{students.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-400 font-mono text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Tên GV</th>
                      <th className="p-4">SĐT</th>
                      <th className="p-4">Môn dạy</th>
                      <th className="p-4">Lớp</th>
                      <th className="p-4">ID</th>
                      <th className="p-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 font-medium">{t.nameGV}</td>
                        <td className="p-4">{t.phoneNumber}</td>
                        <td className="p-4">{t.Mon_day}</td>
                        <td className="p-4">{t.idclass}</td>
                        <td className="p-4 font-mono text-xs">{t.idGV}</td>
                        <td className="p-4">
                          <button className="text-stone-400 hover:text-stone-800"><Edit size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-400 font-mono text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Tên HS</th>
                      <th className="p-4">ID HS</th>
                      <th className="p-4">Lớp</th>
                      <th className="p-4">ID Lớp</th>
                      <th className="p-4">Học phí</th>
                      <th className="p-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 font-medium">{s.nameHS}</td>
                        <td className="p-4 font-mono text-xs">{s.idHS}</td>
                        <td className="p-4">{s.class}</td>
                        <td className="p-4">{s.idclass}</td>
                        <td className="p-4">{s.hocphi.toLocaleString()}đ</td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteStudent(s.idHS, s.idclass)} className="text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'collection' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif italic">Quản lý Thu tiền</h3>
                  <button onClick={handleCalculateCollection} className="px-6 py-2 bg-stone-800 text-white rounded-full text-sm font-medium shadow-lg hover:bg-stone-900">
                    Tính tiền đợt mới
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {thuTienList.map((item) => {
                    const student = students.find(s => s.idHS === item.idHS && s.idclass === item.idclass);
                    const qrUrl = generateQR(item.idHS, item.idclass, item.sotien);
                    return (
                      <div key={item.id} id={`qr-card-${item.id}`} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center">
                        <p className="text-lg font-medium mb-1">{student?.nameHS}</p>
                        <p className="text-xs text-stone-400 mb-4">{item.idclass} - {item.idHS}</p>
                        <div className="bg-stone-50 p-4 rounded-2xl mb-4">
                          <img src={qrUrl} alt="QR" className="w-48 h-48 object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <p className="text-xl font-serif mb-4">{item.sotien.toLocaleString()}đ</p>
                        <button onClick={() => downloadPDF(`qr-card-${item.id}`, `QR_${item.idHS}_${item.idclass}.pdf`)} className="w-full py-2 bg-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                          <Download size={14} /> Tải PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teacher View */}
        {user?.role === 'teacher' && (
          <div className="space-y-8">
            <div className="flex gap-2">
              {['classes', 'attendance', 'income'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab ? 'bg-stone-800 text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200'
                  }`}
                >
                  {tab === 'classes' ? 'Lớp dạy' : tab === 'attendance' ? 'Điểm danh' : 'Thu nhập'}
                </button>
              ))}
            </div>

            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.idclass.split(',').map((idclass: string) => {
                  const classStudents = students.filter(s => s.idclass === idclass.trim());
                  return (
                    <div key={idclass} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-serif italic">{idclass}</h3>
                        <span className="text-xs font-mono text-stone-400">{classStudents.length} học sinh</span>
                      </div>
                      <div className="space-y-3">
                        {classStudents.map(s => (
                          <div key={s.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium">{s.nameHS}</p>
                              <p className="text-[10px] text-stone-400">Buổi học: {s.Tong} | Tiền: {s.Tien.toLocaleString()}đ</p>
                            </div>
                            <button onClick={() => handleDeleteStudent(s.idHS, s.idclass)} className="text-stone-300 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {user.idclass.split(',').map((idclass: string) => (
                    <button key={idclass} onClick={() => setActiveTab(`att-${idclass.trim()}`)} className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium whitespace-nowrap">
                      {idclass.trim()}
                    </button>
                  ))}
                </div>
                {user.idclass.split(',').map((idclass: string) => {
                  const idc = idclass.trim();
                  if (activeTab !== `att-${idc}`) return null;
                  const classStudents = students.filter(s => s.idclass === idc);
                  
                  // Local state for attendance session
                  const [sessionData, setSessionData] = useState<Record<string, string>>({});
                  
                  useEffect(() => {
                    const initial: Record<string, string> = {};
                    const date = new Date().toISOString().split('T')[0];
                    classStudents.forEach(s => initial[s.idHS] = date);
                    setSessionData(initial);
                  }, [idc]);

                  return (
                    <div key={idc} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-serif italic">Điểm danh: {idc}</h3>
                        <button onClick={() => handleResetAttendance(idc)} className="text-xs text-red-500 font-medium">Reset</button>
                      </div>
                      <div className="space-y-4 mb-8">
                        {classStudents.map(s => (
                          <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${sessionData[s.idHS] === '0' ? 'bg-amber-50' : 'bg-stone-50'}`}>
                            <span className="font-medium">{s.nameHS}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSessionData(prev => ({ ...prev, [s.idHS]: new Date().toISOString().split('T')[0] }))}
                                className={`p-2 rounded-full transition-all ${sessionData[s.idHS] !== '0' ? 'bg-green-500 text-white shadow-md' : 'bg-green-100 text-green-600'}`}
                              >
                                <CheckCircle size={20} />
                              </button>
                              <button 
                                onClick={() => setSessionData(prev => ({ ...prev, [s.idHS]: '0' }))}
                                className={`p-2 rounded-full transition-all ${sessionData[s.idHS] === '0' ? 'bg-red-500 text-white shadow-md' : 'bg-red-100 text-red-600'}`}
                              >
                                <XCircle size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleAttendance(idc, sessionData)}
                        className="w-full py-4 bg-stone-800 text-white rounded-2xl font-medium shadow-lg hover:bg-stone-900 transition-colors"
                      >
                        Xác nhận Điểm danh
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'income' && (
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
                <DollarSign size={48} className="mx-auto text-stone-300 mb-4" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-2">Thu nhập của bạn</h3>
                <p className="text-4xl font-serif mb-2">{(user.income1 + user.income2).toLocaleString()}đ</p>
                <div className="flex justify-center gap-8 mt-6">
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase">Đợt 1</p>
                    <p className="font-medium">{user.income1.toLocaleString()}đ</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase">Đợt 2</p>
                    <p className="font-medium">{user.income2.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Student/Parent View */}
        {(user?.role === 'student' || user?.role === 'parent') && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif italic mb-6">Thông tin học tập</h3>
            {students.filter(s => s.idHS === user.idHS).map(s => {
              const teacher = teachers.find(t => t.idclass.includes(s.idclass));
              const thuTien = thuTienList.find(tt => tt.idHS === s.idHS && tt.idclass === s.idclass);
              const qrUrl = generateQR(s.idHS, s.idclass, s.Tien);

              return (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold">{s.idclass}</h4>
                      <p className="text-sm text-stone-500">{s.nameHS} - {s.school}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400">Học phí</p>
                      <p className="font-serif">{s.hocphi.toLocaleString()}đ/buổi</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-[10px] text-stone-400 uppercase">Số buổi học</p>
                      <p className="text-xl font-serif">{s.Tong}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-[10px] text-stone-400 uppercase">Tổng tiền dự tính</p>
                      <p className="text-xl font-serif">{s.Tien.toLocaleString()}đ</p>
                    </div>
                  </div>

                  {user.role === 'parent' && teacher && (
                    <div className="p-4 border border-stone-100 rounded-2xl">
                      <p className="text-[10px] text-stone-400 uppercase mb-2">Thông tin Giáo viên</p>
                      <p className="text-sm font-medium">{teacher.nameGV}</p>
                      <p className="text-sm text-stone-500">{teacher.phoneNumber}</p>
                      <p className="text-sm text-stone-500">Môn: {teacher.Mon_day}</p>
                    </div>
                  )}

                  {s.Tien > 0 && (
                    <div className="flex flex-col items-center pt-4 border-t border-stone-100">
                      <p className="text-xs font-mono text-stone-400 mb-4 uppercase tracking-widest">Thanh toán học phí</p>
                      <img src={qrUrl} alt="QR" className="w-40 h-40 mb-4" referrerPolicy="no-referrer" />
                      <p className="text-xs text-stone-400 text-center">Nội dung: {s.idHS} {s.idclass} chuyen tien hoc them</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h3 className="text-xl font-serif italic mb-6">Yêu cầu đổi mật khẩu</h3>
              <p className="text-sm text-stone-500 mb-6">Để bảo mật hệ thống, vui lòng thay đổi mật khẩu mặc định của bạn.</p>
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <button
                onClick={handlePasswordChange}
                className="w-full py-4 bg-stone-800 text-white rounded-xl font-medium shadow-lg"
              >
                Lưu mật khẩu mới
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-stone-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-mono text-stone-400 animate-pulse">Đang xử lý...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
