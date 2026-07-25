import { Router, type Request, type Response } from "express";
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
} from "../libs/zodValidators.js";

import type { Student, Course } from "../libs/types.js";

// import database
import { students, courses,enrollments } from "../db/db.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  try {
    const courseNo = req.query.courseNo;
    const studentId = req.query.studentId;

    if((courseNo && studentId) || (!courseNo && !studentId)){
      return res.status(200).json({
        ok: false,
        message: "Please provide either studentId or courseNo and not both!"
      });
    }

    if (courseNo) {
      let filtered_students = students.filter(
        (student) => { 
          if(student.courses){
            for(let j=0; j<student.courses.length; j++){
              if(student.courses[j] === courseNo) return true;
            }
            return false;
          }else{
            return false;
          }
        }
      );
      return res.status(200).json({
        ok: true,
        students: filtered_students,
      });
    }else if (studentId) {
      let filtered_enrollments = enrollments.filter(
        (enrollment) => enrollment.studentId === studentId
      );
      return res.status(200).json({
        ok: true,
        courses: filtered_enrollments,
      });
    } else {
      return res.status(200).json({
        ok: true,
        courses: students,
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