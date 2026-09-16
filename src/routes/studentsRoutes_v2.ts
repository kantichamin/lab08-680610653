import { Router, type Request, type Response } from "express";
// นำเข้าตัวตรวจสอบข้อมูล (Zod) จากไฟล์ภายนอก เพื่อตรวจเช็คความถูกต้องของข้อมูลที่รับเข้ามา
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
  zCourseId
} from "../libs/zodValidators.js";

// นำเข้าโครงสร้างประเภทข้อมูล (TypeScript Types) สำหรับนักเรียนและวิชาเรียน
import type { Student, Course } from "../libs/types.js";

// นำเข้าฐานข้อมูลจำลอง (ตัวแปรแบบ Array ในแรม) มาใช้งาน
import { students, courses, enrollments } from "../db/db.js";

// สร้างอ็อบเจกต์ Router ของ Express เพื่อแยกเขียนเส้นทาง API เป็นโมดูลย่อย
const router = Router();

// ==========================================
// [GET] /api/v2/students
// หน้าที่: ดึงรายชื่อนักเรียนทั้งหมด หรือ ดึงแยกตามสาขาวิชา (program)
// ==========================================
router.get("/", (req: Request, res: Response) => {
  try {
    // แกะคำค้นหา "?program=..." ที่ส่งมาทาง URL Query
    const program = req.query.program;

    // กรณีที่ 1: ถ้าผู้ใช้งานมีการกำหนดระบุสาขาวิชา (program) เข้ามา
    if (program) {
      // ทำการกรอง (Filter) เอาเฉพาะนักเรียนที่มีสาขาวิชาตรงกับที่ระบุ
      let filtered_students = students.filter(
        (student) => student.program === program
      );
      // ส่งข้อมูลกลับไปแบบสำเร็จ (200 OK) พร้อมรายการนักเรียนที่กรองแล้ว
      return res.status(200).json({
        success: true,
        data: filtered_students,
      });
    } else {
      // กรณีที่ 2: ถ้าไม่ได้กำหนดส่งสาขามา ให้ส่งรายชื่อนักเรียนทั้งหมดกลับไปทันที (200 OK)
      return res.status(200).json({
        success: true,
        data: students,
      });
    }
  } catch (err) {
    // ดักจับ Error หากระบบภายในพัง ให้ส่งสถานะ 500 (Server Error) กลับไป
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

// ==========================================
// [GET] /api/v2/students/{studentId}
// หน้าที่: ค้นหารายละเอียดของนักเรียนเฉพาะเจาะจง 1 คนผ่านพารามิเตอร์บน URL Path
// ==========================================
router.get("/:studentId", (req: Request, res: Response) => {
  try {
    // แกะรหัสนักศึกษาที่ป้อนส่งต่อท้าย URL มา (เช่น /api/v2/students/650610002)
    const studentId = req.params.studentId;
    // ส่งรหัสนั้นให้ Zod เช็คกฎความถูกต้อง (เช่น รหัสต้องยาว 9 หลักจริงไหม)
    const result = zStudentId.safeParse(studentId);

    // ถ้าตรวจสอบกฎแล้วไม่ผ่าน (รหัสไม่ตรงตามที่กำหนด)
    if (!result.success) {
      // หยุดทำงานทันที และตอบกลับข้อความแจ้งเตือนพร้อมสถานะ 400 (Bad Request)
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    // ทำการค้นหาตำแหน่ง (Index) ของรหัสนักศึกษาคนนั้นใน Array ของระบบ
    const foundIndex = students.findIndex(
      (std: Student) => std.studentId === studentId
    );

    // ถ้าค้นหาตำแหน่งแล้วได้ค่าเป็น -1 แปลว่าไม่มีรหัสนักเรียนคนนี้อยู่ในระบบ
    if (foundIndex === -1) {
      // หยุดทำงานและตอบกลับข้อความสถานะ 404 (Not Found)
      return res.status(404).json({
        success: false,
        message: "Student does not exists",
      });
    }

    // ถ้าผ่านด่านทั้งหมดมาได้ ให้ส่งข้อมูลนักเรียนคนนั้นกลับไป (200 OK)
    return res.status(200).json({
      success: true,
      data: students[foundIndex],
    });
  } catch (err) {
    // ดักจับกรณีระบบภายในเกิดข้อผิดพลาด ส่งสถานะ 500 กลับไป
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

// ==========================================
// [POST] /api/v2/students
// หน้าที่: เพิ่มนักเรียนคนใหม่เข้าสู่ระบบ
// ==========================================
router.post("/", async (req: Request, res: Response) => {
  try {
    // ดึงข้อมูลก้อนวัตถุ JSON ของนักเรียนใหม่ที่ส่งมาจากทาง Request Body
    const body = req.body as Student;

    // เอาข้อมูลนักเรียนใหม่ส่งให้ Zod ช่วยตรวจสอบว่ากรอกข้อมูลครบถ้วน ถูกต้องตามกฎโครงสร้างไหม
    const result = zStudentPostBody.safeParse(body);
    // ถ้ากรอกข้อมูลมาผิดกฎหรือข้อมูลไม่ครบถ้วน
    if (!result.success) {
      // หยุดทำงานและส่งข้อมูลแจกแจงข้อผิดพลาดกลับไปทันที (400 Bad Request)
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    // วิ่งไปตรวจสอบดูว่ารหัสนักศึกษาคนใหม่นี้ ดันไปซ้ำกับคนที่มีอยู่เดิมแล้วหรือไม่
    const found = students.find(
      (student) => student.studentId === body.studentId
    );
    // ถ้ารื้อเจอตัวตนรหัสซ้ำอยู่ในระบบ
    if (found) {
      // หยุดการบันทึกทันทีและตอบกลับเตือนสถานะ 409 (Conflict - ข้อมูลซ้ำซ้อนขัดแย้ง)
      return res.status(409).json({
        success: false,
        message: "Student is already exists",
      });
    }

    // เมื่อผ่านด่านตรวจทุกอย่าง ให้นำข้อมูลนั้นมาเก็บไว้ในตัวแปรนักเรียนใหม่
    const new_student = body;
    // ใช้คำสั่ง .push() ผลักข้อมูลนักเรียนใหม่เพิ่มต่อท้ายแถวในกล่องฐานข้อมูลจำลอง (Array)
    students.push(new_student);

    // แถมระบุลิงก์พิกัดที่อยู่ของนักเรียนใหม่ใส่แนบไว้ใน Response Header ตามมาตรฐานสากล
    res.set("Link", `/students/${new_student.studentId}`);

    // ส่งข้อความยืนยันการเพิ่มข้อมูลสำเร็จ พร้อมรหัสสถานะ 201 (Created - สร้างใหม่สำเร็จ)
    return res.status(201).json({
      success: true,
      data: new_student,
    });
  } catch (err) {
    // ดักจับ Error ฝั่งเซิร์ฟเวอร์ ส่งสถานะ 500 กลับไป
    return res.status(500).json({
      success: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

// ==========================================
// [PUT] /api/v2/students
// หน้าที่: แก้ไข/อัปเดตข้อมูลนักเรียนที่มีอยู่แล้วในระบบ
// ==========================================
router.put("/", (req: Request, res: Response) => {
  try {
    // รับชุดข้อมูลแก้ไขพร้อมรหัสนักศึกษามาจากทาง Request Body
    const body = req.body as Student;

    // เอาชุดข้อมูลส่งให้ Zod ตรวจสอบกฎการอัปเดต (เช่น ช่องอื่นเป็นค่าว่างได้ แต่ห้ามลืมกรอกรหัสประจำตัว)
    const result = zStudentPutBody.safeParse(body);
    // ถ้าข้อมูลกรอกมาไม่ถูกต้องตามข้อกำหนด
    if (!result.success) {
      // หยุดการอัปเดตและแจ้งเตือนกลับทันทีพร้อมสถานะ 400 (Bad Request)
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    // ค้นหาลำดับแถวตำแหน่ง (Index) ของนักศึกษาที่ต้องการจะแก้ไขข้อมูล
    const foundIndex = students.findIndex(
      (student) => student.studentId === body.studentId
    );

    // ถ้าหาตำแหน่งไม่พบ (เท่ากับ -1) แปลว่าไม่มีนักเรียนรหัสนี้ให้แก้ไข
    if (foundIndex === -1) {
      // หยุดทำงานและตอบกลับเตือนสถานะ 404 (Not Found)
      return res.status(404).json({
        success: false,
        message: "Student does not exists",
      });
    }

    // ทำการแก้ไขทับตำแหน่งเดิม โดยการใช้คำสั่งกระจายข้อมูลเก่า (... ข้อมูลเดิม) ผสมควบรวมร่างกับของใหม่ที่ส่งมา
    students[foundIndex] = { ...students[foundIndex], ...body };

    // แนบลิงก์พิกัดข้อมูลส่วนตัวนักศึกษาอัปเดตกลับไปในช่อง Header
    res.set("Link", `/students/${body.studentId}`);

    // ส่งสัญญาณยืนยันการแก้ไขข้อมูลสำเร็จด้วยรหัสสถานะ 200 (OK) พร้อมโชว์ข้อมูลเวอร์ชันใหม่
    return res.status(200).json({
      success: true,
      message: `Student ${body.studentId} has been updated successfully`,
      data: students[foundIndex],
    });
  } catch (err) {
    // ดักรับเหตุการณ์ Error ภายในระบบ ส่งสถานะ 500 กลับไป
    return res.status(500).json({
      success: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

// ==========================================
// [DELETE] /api/v2/students
// หน้าที่: ยกเลิกใบลงทะเบียนเรียน / ถอนรายวิชา (Drop) ของนักศึกษา
// ==========================================
router.delete("/", (req: Request, res: Response) => {
    try {
        // รับข้อมูลรหัสนักศึกษา (studentId) และ รหัสวิชา (courseNo) พร้อมกันจากทาง Body ในช่อง JSON
        const { studentId, courseNo } = req.body;

        // ใช้ Zod แยกตรวจสอบตรวจสอบกฎความถูกต้องการป้อนค่า ทั้งฝั่งรหัสนักศึกษาและรหัสวิชาเรียน
        const parseResult1 = zStudentId.safeParse(studentId);
        const parseResult2 = zCourseId.safeParse(courseNo);

        // ถ้ามีตัวใดตัวหนึ่ง หรือทั้งสองตัวกรอกข้อมูลผิดสเปกกฎหมาย
        if (!parseResult1.success || !parseResult2.success) {
            // หยุดการทำงานทันทีและส่งแจ้งเตือนตรวจสอบล้มเหลวกลับไป (400 Bad Request)
            return res.status(400).json({
                ok: false,
                message: "Validation failed"
            });
        }

        // ค้นหาลำดับพิกัด (Index) ในกล่องตารางกลาง enrollments ที่มีทั้งรหัสนักเรียนและรหัสวิชาตรงกันคู่ &&
        const foundIndex = enrollments.findIndex(
            (enrollment) => enrollment.studentId === studentId && enrollment.courseId === courseNo
        );

        // ถ้าค้นตำแหน่งจับคู่แล้วไม่เจอเลยสักใบ (เท่ากับ -1) แปลว่าเด็กคนนี้ไม่ได้ลงทะเบียนในวิชานี้ไว้
        if (foundIndex === -1) {
            // หยุดทำงานและตอบกลับแจ้งเตือนว่าไม่พบประวัติลงทะเบียนเรียน (404 Not Found)
            return res.status(404).json({
                ok: false,
                message: "Enrollment does not exist",
            });
        }

        // ใช้คำสั่ง .splice() เดินไปที่ลำดับตำแหน่งที่เจอ แล้วทำการลบดึงประวัติการลงทะเบียนใบนั้นหลุดออกจากกล่อง Array ไปจำนวน 1 ใบ
        enrollments.splice(foundIndex, 1);

        // ส่งข้อความตอบกลับยืนยันการถอน/ยกเลิกวิชาเรียนสำเร็จเสร็จสิ้นด้วยรหัสสถานะ 200 (OK)
        return res.status(200).json({
            ok: true,
            message: "Enrollment has been deleted",
        });

    } catch (err) {
        // ดักรับข้อผิดพลาดรันไทม์หลังบ้าน ส่งรหัสระบบล่มสถานะ 500 กลับไปแทน
        return res.status(500).json({
            success: false,
            message: "Something is wrong, please try again",
            error: err,
        });
    }
});

// ส่งออก (Export) ตัวแปรโมดูลเส้นทางนี้ เพื่อให้ไฟล์หลักเซิร์ฟเวอร์ดึงไปติดตั้งเปิดรับลูกค้าใช้งานต่อไป
export default router;