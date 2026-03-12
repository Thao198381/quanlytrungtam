import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import * as xlsx from "xlsx";
import Database from "better-sqlite3";
import cors from "cors";
import bcrypt from "bcryptjs";

const db = new Database("database.sqlite");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nameGV TEXT,
    phoneNumber TEXT,
    Mon_day TEXT,
    school TEXT,
    idclass TEXT,
    idGV TEXT UNIQUE,
    pass TEXT,
    percent REAL,
    income1 REAL,
    income2 REAL
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nameHS TEXT,
    idHS TEXT,
    class TEXT,
    school TEXT,
    idclass TEXT,
    hocphi REAL,
    diemdanh1 TEXT,
    diemdanh2 TEXT,
    diemdanh3 TEXT,
    diemdanh4 TEXT,
    diemdanh5 TEXT,
    diemdanh6 TEXT,
    diemdanh7 TEXT,
    diemdanh8 TEXT,
    diemdanh9 TEXT,
    diemdanh10 TEXT,
    diemdanh11 TEXT,
    diemdanh12 TEXT,
    Tong INTEGER DEFAULT 0,
    Tien REAL DEFAULT 0,
    UNIQUE(idHS, idclass)
  );

  CREATE TABLE IF NOT EXISTS bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    nameBank TEXT,
    SoTK TEXT,
    tkVietQR TEXT
  );

  CREATE TABLE IF NOT EXISTS thutien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idHS TEXT,
    idclass TEXT,
    sotien REAL,
    noidungck TEXT,
    ghi_chu TEXT,
    maQR TEXT,
    UNIQUE(idHS, idclass)
  );

  CREATE TABLE IF NOT EXISTS lichhoc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idclass TEXT UNIQUE,
    lich1 TEXT,
    lich2 TEXT,
    lich3 TEXT,
    lich4 TEXT
  );
`);

// Set default admin password if not exists
const adminConfig = db.prepare("SELECT value FROM admin_config WHERE key = 'password'").get() as any;
if (!adminConfig) {
  const hashed = bcrypt.hashSync("admin", 10);
  db.prepare("INSERT INTO admin_config (key, value) VALUES (?, ?)").run("password", hashed);
  console.log("Default admin password set to 'admin'");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  // --- Auth Routes ---
  app.post("/api/login", (req, res) => {
    const { role, username, password } = req.body;
    console.log(`Login attempt: role=${role}, username=${username}`);

    if (role === "admin") {
      const row = db.prepare("SELECT value FROM admin_config WHERE key = 'password'").get() as any;
      if (row && username === "admin" && bcrypt.compareSync(password, row.value)) {
        return res.json({ success: true, user: { role: "admin", name: "Administrator" } });
      } else {
        console.log("Admin login failed: Invalid credentials or user not found");
      }
    } else if (role === "teacher") {
      const teacher = db.prepare("SELECT * FROM teachers WHERE idGV = ?").get(username);
      if (teacher && (password === teacher.pass)) { // Simple check as per user request or use bcrypt if wanted
        return res.json({ success: true, user: { ...teacher, role: "teacher" } });
      }
    } else if (role === "student" || role === "parent") {
      const student = db.prepare("SELECT * FROM students WHERE idHS = ? LIMIT 1").get(username);
      if (student) {
        return res.json({ success: true, user: { ...student, role } });
      }
    }

    res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
  });

  app.post("/api/admin/change-password", (req, res) => {
    const { newPassword } = req.body;
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE admin_config SET value = ? WHERE key = 'password'").run(hashed);
    res.json({ success: true });
  });

  app.post("/api/teacher/change-password", (req, res) => {
    const { idGV, newPassword } = req.body;
    db.prepare("UPDATE teachers SET pass = ? WHERE idGV = ?").run(newPassword, idGV);
    res.json({ success: true });
  });

  // --- Data Routes ---
  app.get("/api/teachers", (req, res) => {
    const rows = db.prepare("SELECT * FROM teachers").all();
    res.json(rows);
  });

  app.get("/api/students", (req, res) => {
    const rows = db.prepare("SELECT * FROM students").all();
    res.json(rows);
  });

  app.get("/api/bank", (req, res) => {
    const rows = db.prepare("SELECT * FROM bank").all();
    res.json(rows);
  });

  app.get("/api/thutien", (req, res) => {
    const rows = db.prepare("SELECT * FROM thutien").all();
    res.json(rows);
  });

  // --- Upload Routes ---
  app.post("/api/upload/teachers", upload.single("file"), (req: any, res) => {
    const { mode } = req.body; // "overwrite" or "append"
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    if (mode === "overwrite") {
      db.prepare("DELETE FROM teachers").run();
    }

    const insert = db.prepare(`
      INSERT OR REPLACE INTO teachers (nameGV, phoneNumber, Mon_day, school, idclass, idGV, pass, percent, income1, income2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(
          row.nameGV || "",
          row.phoneNumber || "",
          row.Mon_day || "",
          row.school || "",
          row.idclass || "",
          row.idGV || "",
          row.pass || "123456",
          row["%"] || 0,
          row.thu_nhập1 || 0,
          row.thu_nhập2 || 0
        );
      }
    });

    transaction(data);
    res.json({ success: true });
  });

  app.post("/api/upload/students", upload.single("file"), (req: any, res) => {
    const { mode } = req.body;
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    if (mode === "overwrite") {
      db.prepare("DELETE FROM students").run();
    }

    const insert = db.prepare(`
      INSERT OR REPLACE INTO students (nameHS, idHS, class, school, idclass, hocphi, diemdanh1, diemdanh2, diemdanh3, diemdanh4, diemdanh5, diemdanh6, diemdanh7, diemdanh8, diemdanh9, diemdanh10, diemdanh11, diemdanh12, Tong, Tien)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(
          row.nameHS || "",
          row.idHS || "",
          row.class || "",
          row.school || "",
          row.idclass || "",
          row.hocphi || 0,
          row.diemdanh1 || "",
          row.diemdanh2 || "",
          row.diemdanh3 || "",
          row.diemdanh4 || "",
          row.diemdanh5 || "",
          row.diemdanh6 || "",
          row.diemdanh7 || "",
          row.diemdanh8 || "",
          row.diemdanh9 || "",
          row.diemdanh10 || "",
          row.diemdanh11 || "",
          row.diemdanh12 || "",
          row.Tong || 0,
          row.Tien || 0
        );
      }
    });

    transaction(data);
    res.json({ success: true });
  });

  app.post("/api/upload/bank", upload.single("file"), (req: any, res) => {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    db.prepare("DELETE FROM bank").run();
    const insert = db.prepare("INSERT INTO bank (name, nameBank, SoTK, tkVietQR) VALUES (?, ?, ?, ?)");
    
    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(row.name || "", row.nameBank || "", row.SoTK || "", row.tkVietQR || "");
      }
    });
    transaction(data);
    res.json({ success: true });
  });

  // --- Attendance Logic ---
  app.post("/api/attendance", (req, res) => {
    const { idclass, attendanceData } = req.body; // attendanceData: { idHS: 'yyyy/mm/dd' or '0' }
    
    const studentsInClass = db.prepare("SELECT * FROM students WHERE idclass = ?").all(idclass);
    
    // Find next empty diemdanh column
    let colIndex = 1;
    for (let i = 1; i <= 12; i++) {
      const hasData = studentsInClass.some(s => s[`diemdanh${i}`] !== "" && s[`diemdanh${i}`] !== null);
      if (!hasData) {
        colIndex = i;
        break;
      }
      if (i === 12) colIndex = 12; // Fallback to last if all full
    }

    const update = db.prepare(`UPDATE students SET diemdanh${colIndex} = ? WHERE idHS = ? AND idclass = ?`);
    const transaction = db.transaction((data) => {
      for (const idHS in data) {
        update.run(data[idHS], idHS, idclass);
      }
    });
    transaction(attendanceData);

    // Recalculate Tong and Tien
    const studentsToUpdate = db.prepare("SELECT * FROM students WHERE idclass = ?").all(idclass);
    for (const s of studentsToUpdate) {
      let count = 0;
      for (let i = 1; i <= 12; i++) {
        const val = s[`diemdanh${i}`];
        if (val && val !== "0") count++;
      }
      const totalMoney = count * s.hocphi;
      db.prepare("UPDATE students SET Tong = ?, Tien = ? WHERE id = ?").run(count, totalMoney, s.id);
    }

    res.json({ success: true });
  });

  app.post("/api/attendance/reset", (req, res) => {
    const { idclass } = req.body;
    db.prepare(`
      UPDATE students 
      SET diemdanh1='', diemdanh2='', diemdanh3='', diemdanh4='', diemdanh5='', diemdanh6='', 
          diemdanh7='', diemdanh8='', diemdanh9='', diemdanh10='', diemdanh11='', diemdanh12='',
          Tong=0, Tien=0
      WHERE idclass = ?
    `).run(idclass);
    res.json({ success: true });
  });

  // --- Collection Logic ---
  app.post("/api/collection/calculate", (req, res) => {
    const students = db.prepare("SELECT * FROM students").all();
    db.prepare("DELETE FROM thutien").run();
    
    const insert = db.prepare(`
      INSERT INTO thutien (idHS, idclass, sotien, noidungck)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction((rows) => {
      for (const s of rows) {
        const content = `${s.idHS} ${s.idclass} chuyen tien hoc them`;
        insert.run(s.idHS, s.idclass, s.Tien, content);
      }
    });
    transaction(students);
    res.json({ success: true });
  });

  app.post("/api/collection/update-qr", (req, res) => {
    const { idHS, idclass, qrData } = req.body;
    db.prepare("UPDATE thutien SET maQR = ? WHERE idHS = ? AND idclass = ?").run(qrData, idHS, idclass);
    res.json({ success: true });
  });

  // --- CRUD for Admin/Teacher ---
  app.post("/api/students/add", (req, res) => {
    const s = req.body;
    db.prepare(`
      INSERT INTO students (nameHS, idHS, class, school, idclass, hocphi)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(s.nameHS, s.idHS, s.class, s.school, s.idclass, s.hocphi);
    res.json({ success: true });
  });

  app.post("/api/students/delete", (req, res) => {
    const { idHS, idclass } = req.body;
    db.prepare("DELETE FROM students WHERE idHS = ? AND idclass = ?").run(idHS, idclass);
    res.json({ success: true });
  });

  // --- Google Sheets Sync Route ---
  app.post("/api/sync/google-sheets", async (req, res) => {
    const { gasUrl } = req.body;
    try {
      const response = await fetch(gasUrl);
      const data: any = await response.json();

      db.transaction(() => {
        // Sync Teachers
        if (data.dsgv) {
          db.prepare("DELETE FROM teachers").run();
          const ins = db.prepare(`INSERT INTO teachers (nameGV, phoneNumber, Mon_day, school, idclass, idGV, pass, percent, income1, income2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          data.dsgv.forEach((r: any) => ins.run(r.nameGV||"", r.phoneNumber||"", r.Mon_day||"", r.school||"", r.idclass||"", r.idGV||"", r.pass||"123456", r["%"]||0, r.thu_nhập1||0, r.thu_nhập2||0));
        }
        // Sync Students
        if (data.dshs) {
          db.prepare("DELETE FROM students").run();
          const ins = db.prepare(`INSERT INTO students (nameHS, idHS, class, school, idclass, hocphi, diemdanh1, diemdanh2, diemdanh3, diemdanh4, diemdanh5, diemdanh6, diemdanh7, diemdanh8, diemdanh9, diemdanh10, diemdanh11, diemdanh12, Tong, Tien) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          data.dshs.forEach((r: any) => ins.run(r.nameHS||"", r.idHS||"", r.class||"", r.school||"", r.idclass||"", r.hocphi||0, r.diemdanh1||"", r.diemdanh2||"", r.diemdanh3||"", r.diemdanh4||"", r.diemdanh5||"", r.diemdanh6||"", r.diemdanh7||"", r.diemdanh8||"", r.diemdanh9||"", r.diemdanh10||"", r.diemdanh11||"", r.diemdanh12||"", r.Tong||0, r.Tien||0));
        }
        // Sync Bank
        if (data.bank) {
          db.prepare("DELETE FROM bank").run();
          const ins = db.prepare(`INSERT INTO bank (name, nameBank, SoTK, tkVietQR) VALUES (?, ?, ?, ?)`);
          data.bank.forEach((r: any) => ins.run(r.name||"", r.nameBank||"", r.SoTK||"", r.tkVietQR||""));
        }
      })();

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Không thể kết nối với Google Sheets" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
