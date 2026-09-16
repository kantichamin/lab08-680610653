import { Router, type Request, type Response } from "express";
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
  zCourseId,
} from "../libs/zodValidators.js";

import type { Student, Course } from "../libs/types.js";

// import database
import { students, courses,enrollments } from "../db/db.js";

const router = Router();

// router.get("/", (req: Request, res: Response) => {
//   try {
//     const courseNo = req.query.courseNo;
//     const studentId = req.query.studentId;

//     //
//     if(courseNo && studentId){
//       return res.status(200).json({
//         ok: false,
//         message: "Please provide either studentId or courseNo and not both!"
//       });
//     }

//     if (courseNo) {
//       let filtered_students = students.filter(
//         (student) => { 
//           if(student.courses){
//             for(let j=0; j<student.courses.length; j++){
//               if(student.courses[j] === courseNo) return true;
//             }
//             return false;
//           }else{
//             return false;
//           }
//         }
//       );
//       return res.status(200).json({
//         ok: true,
//         students: filtered_students,
//       });
//     }else if (studentId) {
//       let filtered_enrollments = enrollments.filter(
//         (enrollment) => enrollment.studentId === studentId
//       );
//       return res.status(200).json({
//         ok: true,
//         courses: filtered_enrollments,
//       });
//     } else {
//       return res.status(200).json({
//         ok: true,
//         courses: students,
//       });
//     }

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Something is wrong, please try again",
//       error: err,
//     });
//   }
// });

// export default router;

router.get("/", (req: Request, res: Response) => {
  try {
    const courseNo = req.query.courseNo as string;
    const studentId = req.query.studentId as string;

    // 1. ดักจับกรณีส่งเงื่อนไขการค้นหามาเบิ้ลพร้อมกันทั้งคู่
    if (courseNo && studentId) {
      return res.status(200).json({
        ok: false,
        message: "Please provide either studentId or courseNo and not both!"
      });
    }

    // 2. หน้างานที่ 1: ค้นหาด้วยรหัสวิชา (courseNo)
    if (courseNo) {
      // 🌟 เรียกใช้งาน zCourseId เพื่อเช็คกฎว่ารหัสวิชาต้องมีความยาว 6 หลักจริงไหม
      const parseResult = zCourseId.safeParse(courseNo);
      if (!parseResult.success) {
        return res.status(200).json({ // ส่งสถานะ 200 ตามแนวทางของระบบ v1
          ok: false,
          message: "Validation failed",
          errors: parseResult.error.issues[0]?.message // แสดงคำเตือน "Course ID must be 6 digits." จากไฟล์ Validators
        });
      }

      // ขั้นที่หนึ่ง: ไปดักกรองค้นหาใบลงทะเบียนใน enrollments ที่มีรหัสวิชาตรงกับที่ระบุมา
      const enrolledStudentIds = enrollments
        .filter((enrollment) => enrollment.courseId === courseNo)
        .map((enrollment) => enrollment.studentId); // คัดสรุปเก็บไว้เฉพาะรหัสนักศึกษาอย่างเดียวเป็นลิสต์อาเรย์

      // ขั้นที่สอง: เอาลิสต์รหัสนักศึกษาที่กรองเสร็จแล้ว ไปดึงโปรไฟล์ข้อมูลตัวเต็มจากกล่อง students ออกมาโชว์
      const filtered_students = students.filter((student) =>
        enrolledStudentIds.includes(student.studentId)
      );

      return res.status(200).json({
        ok: true,
        students: filtered_students,
      });

    } else if (studentId) {
      // 3. หน้างานที่ 2: ค้นหาด้วยรหัสนักศึกษา (studentId) -> ดูรายชื่อวิชาที่ลงทะเบียนเรียนไว้
      let filtered_enrollments = enrollments.filter(
        (enrollment) => enrollment.studentId === studentId
      );
      return res.status(200).json({
        ok: true,
        courses: filtered_enrollments,
      });

    } else {
      // 4. กรณีไม่ส่งเงื่อนไขอะไรมาคัดกรองเลย ให้แสดงรายชื่อข้อมูลนักศึกษาทั้งหมดตามปกติ
      return res.status(200).json({
        ok: true,
        students: students,
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

export default router;