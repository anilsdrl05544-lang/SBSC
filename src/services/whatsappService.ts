/**
 * WhatsApp Helper Service for School ERP
 * Provides message formatting, phone number sanitization, and URL generation.
 */

export interface FeeReminderParams {
  studentName: string;
  admissionNo: string;
  rollNo: string;
  className: string;
  section: string;
  fatherName: string;
  guardianPhone: string;
  dueAmount: number;
  dueDate?: string;
  schoolName?: string;
  schoolPhone?: string;
  schoolUpi?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankName?: string;

  // Head-Wise Fee Breakdown Fields
  tuitionFee?: number;
  admissionFee?: number;
  registrationFee?: number;
  examFee?: number;
  conveyFee?: number;
  previousDue?: number;
  lateFine?: number;
  totalYearlyDue?: number;
  totalPaid?: number;
}

export interface StudentAttendanceAlertParams {
  studentName: string;
  admissionNo: string;
  rollNo: string;
  className: string;
  section: string;
  fatherName: string;
  guardianPhone: string;
  status: string;
  date: string;
  remarks?: string;
  schoolName?: string;
  schoolPhone?: string;
  classTeacherName?: string;
  absentFinePerDay?: number; // Absent fine rate per day (default: 5)
  todayAbsentFine?: number; // Today's fine (default: 5)
  monthAbsentDays?: number; // Cumulative absent days in month
  totalAbsentFine?: number; // Cumulative fine amount
}

export interface StaffAttendanceAlertParams {
  staffName: string;
  empId: string;
  designation: string;
  phone: string;
  status: string;
  date: string;
  remarks?: string;
  schoolName?: string;
  schoolPhone?: string;
}

export interface FeeReceiptWhatsAppParams {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  rollNo?: string;
  className: string;
  section: string;
  fatherName?: string;
  guardianPhone: string;
  amountPaid: number;
  paymentMethod: string;
  transactionRef?: string;
  date: string;
  monthsPaid?: string[];
  discount?: number;
  fine?: number;
  totalDueBefore?: number;
  balanceRemaining: number;
  feeHeadBreakdown?: { head: string; amount: number }[];
  schoolName?: string;
  schoolPhone?: string;
  schoolUpi?: string;
  remarks?: string;
}

export type FeeReceiptWhatsAppTemplateId = 'hindi_standard' | 'english_standard' | 'compact';

export interface NoticeBroadcastParams {
  noticeTitle: string;
  noticeContent: string;
  category?: string;
  date?: string;
  reopenDate?: string;
  studentName?: string;
  fatherName?: string;
  className?: string;
  section?: string;
  admissionNo?: string;
  schoolName?: string;
  schoolPhone?: string;
}

export type WhatsAppNoticeTemplateId =
  | 'holiday_notice'
  | 'holiday_hindi'
  | 'event_invitation'
  | 'urgent_weather_closure'
  | 'exam_datesheet'
  | 'ptm_meeting'
  | 'general_circular';

export type WhatsAppTemplateId =
  | 'headwise_reminder'
  | 'headwise_hindi_reminder'
  | 'polite_reminder'
  | 'urgent_alert'
  | 'exam_clearance'
  | 'bank_upi_details'
  | 'hindi_reminder'
  | 'custom';

export type WhatsAppAttendanceTemplateId =
  | 'student_absent_standard'
  | 'student_absent_hindi'
  | 'student_leave_ack'
  | 'staff_absent_standard'
  | 'staff_absent_hindi'
  | 'staff_leave_approved';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  description: string;
  tag: string;
  templateText: string;
}

export const WHATSAPP_FEE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'headwise_reminder',
    name: 'All Heads & Head-Wise Fee Due Reminder',
    description: 'Detailed statement showing all fee heads (Tuition, Adm, Reg, Exam, Conveyance, Prev Due, Fine).',
    tag: 'All Heads / Recommended',
    templateText: `Namaste {father_name} ji / Respected Parent,

Greetings from *{school_name}*!

This is an itemized fee statement for your ward:
👤 *Student:* *{student_name}*
🏫 *Class:* *{class_name}-{section}* | Roll: #{roll_no} | Adm No: *{admission_no}*

{fee_head_breakdown}

📅 *Payment Due Date:* {due_date}
💳 *Online Payment (UPI):* \`{school_upi}\`
📍 *Counter Payment:* School Fee Office (Mon-Sat, 8:30 AM - 2:00 PM)

Kindly deposit the pending balance at your earliest convenience to maintain an active fee record.
Thank you for your cooperation!

— *Accounts Department, {school_name}*
📞 Contact: {school_phone}`,
  },
  {
    id: 'headwise_hindi_reminder',
    name: 'मद-वार हिंदी शुल्क सूचना (Head-Wise Hindi Reminder)',
    description: 'सभी फीस हेड (ट्यूशन, प्रवेश, पंजीकरण, परीक्षा, पिछला बकाया) का स्पष्ट हिंदी विवरण।',
    tag: 'Hindi / मद-वार',
    templateText: `नमस्ते {father_name} जी,

*{school_name}* की ओर से सादर प्रणाम।

यह संदेश आपके सुपुत्र/सुपुत्री *{student_name}* (कक्षा: *{class_name}-{section}*, प्रवेश क्रमांक: *{admission_no}*) के मद-वार बकाया शुल्क की सूचना हेतु है:

{fee_head_breakdown}

📅 *अंतिम तिथि (Due Date):* {due_date}
💳 *ऑनलाइन UPI भुगतान:* \`{school_upi}\`

कृपया निर्धारित तिथि से पूर्व विद्यालय कार्यालय अथवा दिए गए UPI माध्यम से शुल्क जमा कराने का कष्ट करें।

सधन्यवाद,
— *कार्यालय / लेखा विभाग, {school_name}*
📞 हेल्पलाइन: {school_phone}`,
  },
  {
    id: 'polite_reminder',
    name: 'Gentle Monthly Reminder',
    description: 'Polite & professional notification for standard monthly fee dues.',
    tag: 'Standard',
    templateText: `Namaste {father_name} ji / Respected Parent,

Greetings from *{school_name}*!

This is a gentle reminder that the pending school fee of *₹{due_amount}* for your ward *{student_name}* (Class: *{class_name}-{section}*, Adm No: *{admission_no}*, Roll: #{roll_no}) is due for payment.

{fee_head_breakdown}

📅 *Due Date:* {due_date}
💳 *Online Payment (UPI):* \`{school_upi}\`

Kindly deposit the fee at your earliest convenience to avoid any late penalty. You may also visit the school fee counter between 8:30 AM to 2:00 PM.

Thank you for your continued cooperation!
— *Accounts Department, {school_name}*
📞 Contact: {school_phone}`,
  },
  {
    id: 'urgent_alert',
    name: 'Urgent Overdue Alert & Surcharge Notice',
    description: 'Firm notice for delayed fee payments with late fine alert.',
    tag: 'Urgent / Defaulters',
    templateText: `⚠️ *URGENT FEE PAYMENT NOTICE* - {school_name}

Dear Parent of *{student_name}* (Adm No: *{admission_no}*, Class: *{class_name}-{section}*),

Our records show that school fee dues of *₹{due_amount}* are currently *OVERDUE*. 

Please arrange to clear the outstanding dues on or before *{due_date}* to avoid late surcharge / administrative hold.

💳 *Pay via UPI ID:* \`{school_upi}\`
📍 *Counter Payment:* School Fee Office (Mon-Sat, 9 AM - 2 PM)

If you have already paid recently, please share the payment screenshot / transaction reference with us.

— *Principal Office / Accounts Section*
📞 Helpline: {school_phone}`,
  },
  {
    id: 'exam_clearance',
    name: 'Examination Admit Card Clearance Notice',
    description: 'Clearance notice required before issuing exam hall tickets / roll slips.',
    tag: 'Exam Season',
    templateText: `📋 *TERM EXAMINATION & ADMIT CARD CLEARANCE NOTICE*

Respected Parent ({father_name} ji),
Greetings from *{school_name}*!

The upcoming Term Examinations are scheduled to commence shortly. As per CBSE / School Examination Bylaws, all students must obtain a *No Dues Slip* to receive their *Examination Admit Card / Roll Slip*.

Student: *{student_name}*
Class & Sec: *{class_name} - {section}* | Adm No: *{admission_no}*
Pending Fee Balance: *₹{due_amount}*
Clearance Deadline: *{due_date}*

Kindly clear the balance amount online via UPI \`{school_upi}\` or deposit at the school counter to ensure hassle-free issuance of the examination admit card.

Regards,
— *Examination Controller, {school_name}*
📞 Helpline: {school_phone}`,
  },
  {
    id: 'bank_upi_details',
    name: 'Detailed Bank Account & Digital Payment Details',
    description: 'Includes complete Bank Account, IFSC, and UPI details for direct NEFT/IMPS/UPI.',
    tag: 'Bank Transfer',
    templateText: `🏛️ *OFFICIAL FEE PAYMENT STATEMENT & BANK DETAILS*

*{school_name}*, Bairwa Nankar, Siddharthnagar

Student Particulars:
👤 Name: *{student_name}*
🎫 Admission No: *{admission_no}*
🏫 Class: *{class_name} - {section}* (Roll #{roll_no})
👨‍👦 Father's Name: {father_name}
💰 *Total Outstanding Dues: ₹{due_amount}*

━━━━━━━━━━━━━━━━━━━━
💳 *DIRECT PAYMENT OPTIONS:*
🔹 *UPI ID (GPay / PhonePe / Paytm):* \`{school_upi}\`
🔹 *Bank Name:* {bank_name}
🔹 *Account Number:* \`{bank_account_no}\`
🔹 *IFSC Code:* \`{bank_ifsc}\`
🔹 *Branch:* Bairwa Nankar, Siddharthnagar
━━━━━━━━━━━━━━━━━━━━

*(Important: After completing the transfer, please send the transaction screenshot or UTR number on this WhatsApp number for instant receipt generation).*

— *Accounts Section, {school_name}*
📞 Phone: {school_phone}`,
  },
  {
    id: 'hindi_reminder',
    name: 'हिंदी में शुल्क सूचना (Bilingual Hindi Reminder)',
    description: 'Easy-to-understand Hindi reminder message for local parents.',
    tag: 'Hindi / लोकल',
    templateText: `नमस्ते {father_name} जी,

*{school_name}* की ओर से सादर प्रणाम।

यह संदेश आपको सूचित करने के लिए है कि आपके सुपुत्र/सुपुत्री *{student_name}* (कक्षा: *{class_name}-{section}*, प्रवेश क्रमांक: *{admission_no}*) का विद्यालय शुल्क *₹{due_amount}* बकाया है।

📅 *अंतिम तिथि:* {due_date}
💳 *ऑनलाइन UPI भुगतान:* \`{school_upi}\`

कृपया निर्धारित तिथि से पूर्व विद्यालय कार्यालय अथवा दिए गए UPI माध्यम से शुल्क जमा कराने का कष्ट करें।

सधन्यवाद,
— *कार्यालय, {school_name}*
📞 हेल्पलाइन: {school_phone}`,
  },
];

export const WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'student_absent_hindi',
    name: 'दैनिक अनुपस्थिति सूचना (Bilingual Hindi - अर्थदंड सहित)',
    description: 'Clear Hindi notice informing parents of absence with absent fine (₹5/day).',
    tag: 'Hindi / लोकल',
    templateText: `🏫 *{school_name}*
📋 *दैनिक उपस्थिति सूचना - अभिभावक संदेश*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आदरणीय अभिभावक ({father_name} जी),
सादर प्रणाम।

यह संदेश आपको सूचित करने के लिए है कि आज दिनांक *{date}* को आपका पाल्य:
👤 *नाम:* *{student_name}*
🎫 *प्रवेश क्रमांक:* {admission_no} (रोल नं: #{roll_no})
🏫 *कक्षा:* *{class_name} - {section}*
📌 *दैनिक स्थिति:* *{status}* {remarks}
{absent_fine_notice}

यदि अनुपस्थिति का कोई विशेष कारण अथवा अस्वस्थता है, तो कृपया कक्षाध्यापक को सूचित करते हुए अवकाश प्रार्थना पत्र प्रेषित करें ताकि छात्र की पढ़ाई प्रभावित न हो।

— *कार्यालय, {school_name}*
📞 हेल्पलाइन: {school_phone}`,
  },
  {
    id: 'student_absent_standard',
    name: 'Official Absent Alert (English - with Fine)',
    description: 'Formal CBSE notice sent to parents when a student is marked absent with absent fine.',
    tag: 'Recommended / Standard',
    templateText: `🏫 *{school_name}*
📋 *DAILY ATTENDANCE NOTIFICATION (छात्र अनुपस्थिति सूचना)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Parent ({father_name} ji),

This is to notify you that your ward:
👤 *Student:* *{student_name}*
🎫 *Admission No:* {admission_no} | *Roll No:* #{roll_no}
🏫 *Class & Section:* *{class_name} - {section}*
📅 *Date:* {date}
📌 *Status on Record:* *{status}* {remarks}
{absent_fine_notice}

Class Teacher: *{teacher_name}*
School Helpline: *{school_phone}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Important Note:* Regular attendance of 75%+ is compulsory as per board guidelines. If your ward was absent due to sickness or unavoidable urgency, kindly send a leave application or contact the school office.

— *Office of the Principal*
*{school_name}*`,
  },
  {
    id: 'student_absent_fine_hindi',
    name: 'अनुपस्थिति एवं अर्थदंड सूचना (Absent Notice with Fine - ₹5/दिन)',
    description: 'विशेष अनुपस्थिति सूचना जिसमें विद्यालय नियमानुसार ₹5 प्रति दिन अर्थदंड का विवरण शामिल है।',
    tag: 'अर्थदंड / Fine',
    templateText: `🏫 *{school_name}*
📋 *दैनिक अनुपस्थिति एवं अर्थदंड सूचना (Absent Notice with Fine)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आदरणीय अभिभावक ({father_name} जी),
सादर प्रणाम।

यह संदेश आपको सूचित करने के लिए है कि आज दिनांक *{date}* को आपका पाल्य:
👤 *छात्र:* *{student_name}*
🎫 *प्रवेश क्रमांक:* {admission_no} | *रोल नं:* #{roll_no}
🏫 *कक्षा:* *{class_name} - {section}*
📌 *उपस्थिति स्थिति:* *{status}* {remarks}
{absent_fine_notice}

⚠️ *सूचना:* विद्यालय नियमानुसार बिना पूर्व सूचना अथवा अवकाश आवेदन के अनुपस्थित रहने पर रु 5 प्रति दिन अनुपस्थिति अर्थदंड देय है। यदि अस्वस्थता अथवा अपरिहार्य कारण से अवकाश है, तो कृपया शीघ्र अवकाश प्रार्थना पत्र प्रेषित करें।

— *प्रधानाचार्य / अनुशासन विभाग*
*{school_name}* | 📞 {school_phone}`,
  },
  {
    id: 'student_leave_ack',
    name: 'Leave Acknowledgment & Study Advisory',
    description: 'Confirmation note sent when a student has taken an authorized leave.',
    tag: 'Sanctioned Leave',
    templateText: `🏫 *{school_name}*
📝 *LEAVE APPLICATION STATUS / ACKNOWLEDGMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent ({father_name} ji),

We have recorded the leave status for your ward:
👤 *Student:* *{student_name}* (Roll #{roll_no})
🏫 *Class:* *{class_name} - {section}* | Adm No: {admission_no}
📅 *Date:* {date}
📌 *Status on Record:* *SANCTIONED LEAVE*
📝 *Reason / Remark:* {remarks}

Please ensure your ward catches up on the missed homework and class assignments upon returning.

— *Class Teacher & Academic Office*
*{school_name}* | 📞 {school_phone}`,
  },
];

export const WHATSAPP_STAFF_ATTENDANCE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'staff_absent_standard',
    name: 'Official Faculty Absence Advisory (English)',
    description: 'Formal administrative advisory notice sent to staff/teachers recorded as absent today.',
    tag: 'Official Advisory',
    templateText: `🏫 *{school_name}* - Faculty Administration
📋 *STAFF DAILY ATTENDANCE & LEAVE ADVISORY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Faculty Member (*{staff_name}*),
Employee ID: *{emp_id}* | Designation: *{designation}*

This is an administrative advisory that your attendance for today (*{date}*) has been recorded in the faculty muster roll as:
📌 *Status:* *{status}* {remarks}

Kindly submit your formal Leave Application / Medical certificate or notify the Principal's office at your earliest convenience to regularize the muster roll and ensure class substitution arrangements.

— *Office of the Principal / Administrative Officer*
*{school_name}*
📞 {school_phone}`,
  },
  {
    id: 'staff_absent_hindi',
    name: 'शिक्षक/स्टाफ अनुपस्थिति एवं अवकाश सूचना (Hindi)',
    description: 'Formal Hindi advisory notice for teachers and staff regarding daily absence.',
    tag: 'Hindi / अनुपस्थिति',
    templateText: `🏫 *{school_name}*
📋 *शिक्षक/स्टाफ अनुपस्थिति एवं अवकाश सूचना*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
सादर *{staff_name}* जी (कर्मचारी ID: *{emp_id}*),
पद: *{designation}*

संस्थान के दैनिक उपस्थिति रजिस्टर में आज दिनांक *{date}* को आपकी स्थिति *{status}* दर्ज की गई है। {remarks}

कृपया संस्थागत नियमानुसार अपना अवकाश प्रार्थना पत्र शीघ्र अति शीघ्र कार्यालय में प्रस्तुत करें ताकि अध्यापन एवं कक्षाओं का प्रबंधन सुचारू रह सके।

— *प्रधानाचार्य / प्रशासनिक कार्यालय*
*{school_name}*
📞 {school_phone}`,
  },
  {
    id: 'staff_leave_approved',
    name: 'Staff Leave Sanction & Acknowledgment',
    description: 'Confirmation note acknowledging faculty sanctioned, casual, or medical leave.',
    tag: 'Leave Sanctioned',
    templateText: `🏫 *{school_name}*
✅ *STAFF LEAVE SANCTION & RECORD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *{staff_name}* ({designation}),
Employee ID: *{emp_id}*

Your leave application for today (*{date}*) has been acknowledged and recorded in the faculty register as:
📌 *Status:* *SANCTIONED LEAVE*
📝 *Remark / Note:* {remarks}

Thank you for prior intimation and coordination with the academic office.

— *Human Resource & Faculty Administration*
*{school_name}* | 📞 {school_phone}`,
  },
  {
    id: 'staff_leave_hindi',
    name: 'स्टाफ अवकाश स्वीकृति एवं अभिलेख (Hindi)',
    description: 'Hindi acknowledgment for faculty approved and sanctioned leave.',
    tag: 'Hindi / स्वीकृत अवकाश',
    templateText: `🏫 *{school_name}*
✅ *स्टाफ अवकाश स्वीकृति एवं अभिलेख*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
सादर *{staff_name}* जी ({designation}),
कर्मचारी ID: *{emp_id}*

दिनांक *{date}* के लिए आपका अवकाश संस्थागत रजिस्टर में विधिवत दर्ज एवं स्वीकृत कर लिया गया है।
📌 *दर्ज स्थिति:* *स्वीकृत अवकाश (LEAVE)*
📝 *टिप्पणी:* {remarks}

पूर्व सूचना एवं शिक्षण व्यवस्था में सहयोग हेतु धन्यवाद।

— *प्रशासनिक कार्यालय, {school_name}*
📞 {school_phone}`,
  },
  {
    id: 'staff_half_day',
    name: 'Staff Half-Day / Late Arrival Intimation',
    description: 'Advisory note for half-day or late arrival recorded on muster roll.',
    tag: 'Half-Day / Late',
    templateText: `🏫 *{school_name}* - Faculty Administration
⏱️ *STAFF HALF-DAY / LATE ARRIVAL RECORD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *{staff_name}* ({designation}),
Employee ID: *{emp_id}*

This is to confirm that your attendance for today (*{date}*) has been recorded in the attendance muster roll as:
📌 *Status:* *{status}*
📝 *Remarks:* {remarks}

Please ensure completion of your assigned periods and class logbooks before departure.

— *Academic Supervisor / Principal*
*{school_name}* | 📞 {school_phone}`,
  },
  {
    id: 'staff_duty_summary',
    name: 'Daily Faculty Duty & Register Confirmation',
    description: 'General daily register confirmation of presence and teaching duty.',
    tag: 'Duty Confirmation',
    templateText: `🏫 *{school_name}*
📋 *DAILY FACULTY ATTENDANCE CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *{staff_name}* ({designation}),
Employee ID: *{emp_id}*

Your attendance for today (*{date}*) is confirmed on the muster roll:
📌 *Status on Record:* *{status}* {remarks}

Wishing you a productive teaching day!

— *Administration Desk, {school_name}*
📞 {school_phone}`,
  },
];

export const WHATSAPP_NOTICE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'holiday_notice',
    name: 'School Holiday Announcement (English)',
    description: 'Formal announcement for festival holidays, vacations, and declared breaks.',
    tag: 'Holiday / छुट्टी',
    templateText: `🏫 *{school_name}*
🏖️ *OFFICIAL HOLIDAY NOTIFICATION (अवकाश सूचना)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent ({father_name} ji),
Ward: *{student_name}* (Class: *{class_name} - {section}*)

Kindly note that the school shall remain *CLOSED* on account of:
📌 *{notice_title}*
📅 *Holiday Date:* *{date}*

{notice_content}

📅 *School Reopening Date:* *{reopen_date}*
Students are advised to complete their revision and assigned home tasks during the break.

Warm regards,
— *Office of the Principal*
*{school_name}*
📞 Helpline: {school_phone}`,
  },
  {
    id: 'holiday_hindi',
    name: 'विद्यालय अवकाश सूचना (Bilingual Hindi)',
    description: 'Clear Hindi holiday declaration note for parents and students.',
    tag: 'Hindi / लोकल',
    templateText: `🏫 *{school_name}*
🏖️ *विद्यालय अवकाश सूचना (School Holiday Notice)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आदरणीय अभिभावक ({father_name} जी),
सादर प्रणाम।

छात्र: *{student_name}* (कक्षा: *{class_name} - {section}*)

आपको सूचित किया जाता है कि *{notice_title}* के उपलक्ष्य में दिनांक *{date}* को विद्यालय में पठन-पाठन पूर्णतः स्थगित (अवकाश) रहेगा।

{notice_content}

📅 *विद्यालय पुनः खुलने का दिनांक:* *{reopen_date}*
कृपया छात्र को अवकाश गृहकार्य व अध्ययन हेतु प्रेरित करें।

— *प्रधानाचार्य / प्रबंधन कार्यालय*
*{school_name}*
📞 हेल्पलाइन: {school_phone}`,
  },
  {
    id: 'event_invitation',
    name: 'School Event & Function Invitation',
    description: 'Invitation for Annual Day, Sports Meet, Exhibitions, and Celebrations.',
    tag: 'Event / कार्यक्रम',
    templateText: `🏫 *{school_name}*
🎪 *SPECIAL INVITATION & EVENT ANNOUNCEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent ({father_name} ji),
Ward: *{student_name}* (Class: *{class_name} - {section}*)

We take immense pleasure in cordially inviting you and your family to our upcoming school event:
🌟 *{notice_title}*
📅 *Date of Event:* *{date}*
📍 *Venue:* School Campus Auditorium, {school_name}

{notice_content}

Your gracious presence and blessings will encourage our young students!

Warm regards,
— *Organizing Committee & Principal*
*{school_name}*
📞 Contact: {school_phone}`,
  },
  {
    id: 'urgent_weather_closure',
    name: 'Urgent Weather / Administrative Closure',
    description: 'Cold wave, heavy rain, or DM orders emergency closure alert.',
    tag: 'Urgent / आपातकालीन',
    templateText: `🚨 *URGENT ADVISORY: SCHOOL CLOSURE NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent ({father_name} ji),
Student: *{student_name}* (Class: *{class_name} - {section}*)

📢 *{notice_title}*

As per official directives from the District Administration / intense weather forecast, the school shall remain *CLOSED* on *{date}*.

{notice_content}

Next working day and updated schedules will be notified accordingly. Please keep students indoors and safe.

— *Principal, {school_name}*
📞 Helpline: {school_phone}`,
  },
  {
    id: 'exam_datesheet',
    name: 'Examination Timetable & Advisory Circular',
    description: 'Announcing upcoming exams, datesheet, reporting time, and syllabus.',
    tag: 'Exam / परीक्षा',
    templateText: `🏫 *{school_name}*
📝 *EXAMINATION DATESHEET & ADVISORY CIRCULAR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent ({father_name} ji),
Student: *{student_name}* (Class: *{class_name} - {section}*)

📢 *{notice_title}*
📅 *Commencing From:* *{date}*

{notice_content}

📌 *Important Instructions:*
1. Students must report in neat school uniform 15 minutes before the bell.
2. Ensure Admit Cards and stationery kits are brought daily.
3. No electronic gadgets/smartwatches allowed in the examination hall.

Best wishes for the examinations,
— *Examination Controller*
*{school_name}* | 📞 {school_phone}`,
  },
  {
    id: 'ptm_meeting',
    name: 'Parent-Teacher Meeting (PTM) Circular',
    description: 'Inviting parents to review progress, report cards, and feedback.',
    tag: 'PTM / बैठक',
    templateText: `🏫 *{school_name}*
🤝 *PARENT-TEACHER MEETING (PTM) CIRCULAR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Parent ({father_name} ji),
Student: *{student_name}* (Class: *{class_name} - {section}*)

You are cordially requested to attend the Parent-Teacher Meeting to discuss your child's academic performance, discipline, and progress report.

📢 *Topic / Agenda:* *{notice_title}*
📅 *Date & Timings:* *{date}*

{notice_content}

Your active participation and valuable feedback are essential for your ward's overall success.

With warm regards,
— *Class Teacher & Principal*
*{school_name}* | 📞 {school_phone}`,
  },
  {
    id: 'general_circular',
    name: 'General School Circular / Bulletin',
    description: 'Customizable announcement for all routine school notices.',
    tag: 'General / सामान्य',
    templateText: `🏫 *{school_name}*
📢 *OFFICIAL INSTITUTIONAL CIRCULAR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent / Guardian of *{student_name}* (Class: *{class_name} - {section}*),

Subject: *{notice_title}*
Date: *{date}*

{notice_content}

For any queries, feel free to contact the school office.

— *Administrative Desk*
*{school_name}*
📞 Helpline: {school_phone}`,
  },
];

/**
 * Safely formats YYYY-MM-DD or ISO dates into friendly Indian format (e.g. 08 Sep 2026)
 * avoiding UTC midnight timezone shifts.
 */
export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const clean = dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return clean;
}

/**
 * Cleans phone number to standard international format without '+' or spaces.
 * Automatically handles:
 * - 10-digit Indian phone numbers (adds '91')
 * - Leading zeros e.g. 094151...
 * - Country code with trunk e.g. 9109415...
 * - International + symbols, spaces, hyphens and brackets
 */
export function cleanPhoneNumber(phone: string, defaultCountryCode = '91'): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');

  // If starts with 00 (international format), remove 00
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // If starts with 910... (e.g. +91 09415...), strip the 0 after country code
  if (digits.startsWith('910') && digits.length === 13) {
    digits = '91' + digits.substring(3);
  }

  // If starts with single 0 (trunk prefix e.g. 09415...), remove the 0
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // If it's a 10-digit number, prepend default country code (India 91)
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  // If already includes country code e.g. 919876543210 (12 digits)
  return digits;
}

/**
 * Formats a clean itemized text breakdown of all fee heads for WhatsApp & reminders.
 */
export function formatFeeHeadBreakdown(params: {
  tuitionFee?: number;
  admissionFee?: number;
  registrationFee?: number;
  examFee?: number;
  conveyFee?: number;
  previousDue?: number;
  lateFine?: number;
  totalYearlyDue?: number;
  totalPaid?: number;
  netDue?: number;
}): string {
  const effConveyFee = params.conveyFee === 600 ? 0 : (params.conveyFee || 0);
  const lines: string[] = [
    '📋 *All Fee Heads Breakdown (मद-वार शुल्क विवरण):*',
    `• Tuition Fee (शिक्षण शुल्क): ₹${(params.tuitionFee || 0).toLocaleString('en-IN')}`,
    `• Admission Fee (प्रवेश शुल्क): ₹${(params.admissionFee || 0).toLocaleString('en-IN')}`,
    `• Registration Fee (पंजीकरण शुल्क): ₹${(params.registrationFee || 0).toLocaleString('en-IN')}`,
    `• Examination Fee (परीक्षा शुल्क): ₹${(params.examFee || 0).toLocaleString('en-IN')}`,
    `• Conveyance / Transport (वाहन शुल्क): ₹${effConveyFee.toLocaleString('en-IN')}`,
    `• Previous Due (पिछला बकाया): ₹${(params.previousDue || 0).toLocaleString('en-IN')}`,
    `• Late Fine (विलंब शुल्क): ₹${(params.lateFine || 0).toLocaleString('en-IN')}`,
  ];

  if (typeof params.totalYearlyDue === 'number') {
    lines.push('────────────────────────');
    lines.push(`💰 *Total Yearly Fee (कुल वार्षिक शुल्क):* ₹${params.totalYearlyDue.toLocaleString('en-IN')}`);
  }
  if (typeof params.totalPaid === 'number' && params.totalPaid > 0) {
    lines.push(`✅ *Amount Paid (जमा शुल्क):* ₹${params.totalPaid.toLocaleString('en-IN')}`);
  }
  const netDue = typeof params.netDue === 'number' ? params.netDue : (typeof params.totalYearlyDue === 'number' && typeof params.totalPaid === 'number' ? Math.max(0, params.totalYearlyDue - params.totalPaid) : 0);
  lines.push(`🔴 *Net Due Payable (कुल देय बकाया):* *₹${netDue.toLocaleString('en-IN')}*`);

  return lines.join('\n');
}

/**
 * Replaces placeholders in the template text with actual student parameters.
 */
export function formatFeeReminderMessage(
  templateText: string,
  params: FeeReminderParams
): string {
  const defaultDueDate = params.dueDate
    ? formatFriendlyDate(params.dueDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const effConveyFee = params.conveyFee === 600 ? 0 : (params.conveyFee || 0);
  const effTotalYearlyDue =
    params.totalYearlyDue ??
    ((params.tuitionFee || 0) +
      (params.admissionFee || 0) +
      (params.registrationFee || 0) +
      (params.examFee || 0) +
      effConveyFee +
      (params.previousDue || 0) +
      (params.lateFine || 0));

  const headBreakdownText = formatFeeHeadBreakdown({
    tuitionFee: params.tuitionFee,
    admissionFee: params.admissionFee,
    registrationFee: params.registrationFee,
    examFee: params.examFee,
    conveyFee: effConveyFee,
    previousDue: params.previousDue,
    lateFine: params.lateFine,
    totalYearlyDue:
      params.conveyFee === 600 && typeof params.totalYearlyDue === 'number' && params.totalYearlyDue >= 600
        ? params.totalYearlyDue - 600
        : effTotalYearlyDue,
    totalPaid: params.totalPaid || 0,
    netDue: params.dueAmount,
  });

  return templateText
    .replace(/{fee_head_breakdown}/g, headBreakdownText)
    .replace(/{head_wise_due}/g, headBreakdownText)
    .replace(/{tuition_fee}/g, (params.tuitionFee || 0).toLocaleString('en-IN'))
    .replace(/{admission_fee}/g, (params.admissionFee || 0).toLocaleString('en-IN'))
    .replace(/{registration_fee}/g, (params.registrationFee || 0).toLocaleString('en-IN'))
    .replace(/{exam_fee}/g, (params.examFee || 0).toLocaleString('en-IN'))
    .replace(/{convey_fee}/g, effConveyFee.toLocaleString('en-IN'))
    .replace(/{transport_fee}/g, effConveyFee.toLocaleString('en-IN'))
    .replace(/{previous_due}/g, (params.previousDue || 0).toLocaleString('en-IN'))
    .replace(/{late_fine}/g, (params.lateFine || 0).toLocaleString('en-IN'))
    .replace(/{total_yearly_due}/g, (params.totalYearlyDue ?? params.dueAmount).toLocaleString('en-IN'))
    .replace(/{total_paid}/g, (params.totalPaid || 0).toLocaleString('en-IN'))
    .replace(/{net_due}/g, params.dueAmount.toLocaleString('en-IN'))
    .replace(/{student_name}/g, params.studentName || 'Student')
    .replace(/{admission_no}/g, params.admissionNo || 'N/A')
    .replace(/{roll_no}/g, params.rollNo || 'N/A')
    .replace(/{class_name}/g, params.className || '')
    .replace(/{section}/g, params.section || 'A')
    .replace(/{father_name}/g, params.fatherName || 'Parent')
    .replace(/{guardian_phone}/g, params.guardianPhone || '')
    .replace(/{due_amount}/g, params.dueAmount.toLocaleString('en-IN'))
    .replace(/{due_date}/g, defaultDueDate)
    .replace(/{school_name}/g, params.schoolName || 'SBSC Public School')
    .replace(/{school_phone}/g, params.schoolPhone || '+91 94150 00000')
    .replace(/{school_upi}/g, params.schoolUpi || 'anilsingh636-2@oksbi')
    .replace(/{bank_account_no}/g, params.bankAccountNo || '38942948293')
    .replace(/{bank_ifsc}/g, params.bankIfsc || 'SBIN0001234')
    .replace(/{bank_name}/g, params.bankName || 'State Bank of India');
}

/**
 * Replaces placeholders in the student attendance template.
 * Strictly adds absent fine (₹5 per absent day) ONLY when student status is ABSENT.
 */
export function formatStudentAttendanceMessage(
  templateText: string,
  params: StudentAttendanceAlertParams
): string {
  const formattedDate = formatFriendlyDate(params.date);
  const rawStatus = (params.status || 'ABSENT').trim();
  const isAbsent = rawStatus.toLowerCase() === 'absent';
  const finePerDay = params.absentFinePerDay ?? 5;
  const todayFine = params.todayAbsentFine ?? finePerDay;
  const monthAbsentDays = params.monthAbsentDays ?? 1;
  const totalFine = params.totalAbsentFine ?? (monthAbsentDays * finePerDay);

  // Absent Fine notice text: ONLY generated when student is marked ABSENT
  let absentFineNotice = '';
  if (isAbsent) {
    absentFineNotice = `💰 *अनुपस्थिति अर्थदंड (Absent Fine):* ₹${todayFine} (दर: रु ${finePerDay} प्रति दिन)`;
    if (monthAbsentDays > 1) {
      absentFineNotice += `\n📊 *इस माह कुल अनुपस्थिति:* ${monthAbsentDays} दिन (कुल अर्थदंड: ₹${totalFine})`;
    }
  }

  let formatted = templateText
    .replace(/{student_name}/g, params.studentName || 'Student')
    .replace(/{admission_no}/g, params.admissionNo || 'N/A')
    .replace(/{roll_no}/g, params.rollNo || 'N/A')
    .replace(/{class_name}/g, params.className || 'Class')
    .replace(/{section}/g, params.section || 'A')
    .replace(/{father_name}/g, params.fatherName || 'Parent')
    .replace(/{guardian_phone}/g, params.guardianPhone || '')
    .replace(/{status}/g, rawStatus.toUpperCase())
    .replace(/{remarks}/g, params.remarks ? `(${params.remarks})` : '')
    .replace(/{date}/g, formattedDate)
    .replace(/{teacher_name}/g, params.classTeacherName || 'Class Teacher')
    .replace(/{school_name}/g, params.schoolName || 'SBSC Public School')
    .replace(/{school_phone}/g, params.schoolPhone || '+91 94150 00000')
    .replace(/{absent_fine_per_day}/g, String(finePerDay))
    .replace(/{fine_per_day}/g, String(finePerDay))
    .replace(/{absent_fine}/g, isAbsent ? String(todayFine) : '')
    .replace(/{today_absent_fine}/g, isAbsent ? String(todayFine) : '')
    .replace(/{month_absent_days}/g, isAbsent ? String(monthAbsentDays) : '')
    .replace(/{total_absent_fine}/g, isAbsent ? String(totalFine) : '')
    .replace(/{absent_fine_notice}/g, absentFineNotice);

  // If the student is ABSENT and the template did not explicitly include {absent_fine_notice}
  // or absent fine keywords, automatically insert the absent fine line right after the status line!
  if (isAbsent && !formatted.includes('Absent Fine') && !formatted.includes('अनुपस्थिति अर्थदंड') && !formatted.includes('अनुपस्थिति दंड')) {
    const statusMatch = formatted.match(/(📌\s*(?:दैनिक स्थिति|Status on Record|उपस्थिति स्थिति|Status|स्थिति):[^\n]*)/i);
    if (statusMatch && statusMatch[0]) {
      formatted = formatted.replace(statusMatch[0], `${statusMatch[0]}\n${absentFineNotice}`);
    } else {
      formatted += `\n\n${absentFineNotice}`;
    }
  }

  // Strict constraint: "यह केवल absent massege me show kare."
  // If the student is NOT absent (e.g. Leave, Present, Holiday, etc.), completely clean out any fine text
  if (!isAbsent) {
    formatted = formatted
      .replace(/{absent_fine_notice}/g, '')
      .replace(/💰\s*\*(?:अनुपस्थिति अर्थदंड|Absent Fine)[^\n]*\n?/gi, '')
      .replace(/📊\s*\*इस माह कुल अनुपस्थिति[^\n]*\n?/gi, '')
      .replace(/⚠️\s*\*सूचना:\*\s*विद्यालय नियमानुसार बिना पूर्व सूचना[^\n]*\n?/gi, '')
      .replace(/नियम:\s*विद्यालय नियमानुसार अनाधिकृत अनुपस्थिति पर[^\n]*\n?/gi, '');
  }

  return formatted.trim();
}

/**
 * Replaces placeholders in the staff attendance template.
 */
export function formatStaffAttendanceMessage(
  templateText: string,
  params: StaffAttendanceAlertParams
): string {
  const formattedDate = formatFriendlyDate(params.date);

  return templateText
    .replace(/{staff_name}/g, params.staffName || 'Faculty Member')
    .replace(/{teacher_name}/g, params.staffName || 'Faculty Member')
    .replace(/{name}/g, params.staffName || 'Faculty Member')
    .replace(/{student_name}/g, params.staffName || 'Faculty Member')
    .replace(/{father_name}/g, params.staffName || 'Faculty Member')
    .replace(/{emp_id}/g, params.empId || 'N/A')
    .replace(/{employee_id}/g, params.empId || 'N/A')
    .replace(/{id}/g, params.empId || 'N/A')
    .replace(/{roll_no}/g, params.empId || 'N/A')
    .replace(/{admission_no}/g, params.empId || 'N/A')
    .replace(/{designation}/g, params.designation || 'Faculty Member')
    .replace(/{role}/g, params.designation || 'Faculty Member')
    .replace(/{post}/g, params.designation || 'Faculty Member')
    .replace(/{class_name}/g, params.designation || 'Faculty Member')
    .replace(/{section}/g, '')
    .replace(/{phone}/g, params.phone || '')
    .replace(/{mobile}/g, params.phone || '')
    .replace(/{guardian_phone}/g, params.phone || '')
    .replace(/{status}/g, (params.status || 'ABSENT').toUpperCase())
    .replace(/{remarks}/g, params.remarks ? `(${params.remarks})` : '')
    .replace(/{remark}/g, params.remarks ? `(${params.remarks})` : '')
    .replace(/{notes}/g, params.remarks ? `(${params.remarks})` : '')
    .replace(/{date}/g, formattedDate)
    .replace(/{school_name}/g, params.schoolName || 'SBSC Public School')
    .replace(/{school_phone}/g, params.schoolPhone || '+91 94150 00000');
}

/**
 * Formats official fee collection receipt message for WhatsApp.
 * Accurately conveys payment details, fee heads, concession, and remaining dues balance.
 */
export function formatFeeReceiptWhatsAppMessage(
  params: FeeReceiptWhatsAppParams,
  templateId: FeeReceiptWhatsAppTemplateId = 'hindi_standard'
): string {
  const formattedDate = formatFriendlyDate(params.date);
  const schoolName = params.schoolName || 'Saraswati Bal Shishu Mandir';
  const schoolPhone = params.schoolPhone || '+91 94150 00000';
  const monthsStr =
    params.monthsPaid && params.monthsPaid.length > 0
      ? params.monthsPaid.join(', ')
      : 'Current Session';

  const discountLine =
    params.discount && params.discount > 0
      ? `🎁 *छूट / Concession:* ₹${params.discount.toLocaleString('en-IN')}\n`
      : '';

  const fineLine =
    params.fine && params.fine > 0
      ? `⚠️ *विलंब शुल्क (Late Fine):* ₹${params.fine.toLocaleString('en-IN')}\n`
      : '';

  const txnLine = params.transactionRef ? `(Ref: ${params.transactionRef})` : '';

  const balanceStatus =
    params.balanceRemaining <= 0
      ? '🎉 *बधाई:* छात्र का समस्त पिछला व वर्तमान शुल्क पूर्णतः जमा (Nil / No Dues) हो चुका है।'
      : `📌 *शेष बकाया शुल्क (Remaining Due):* *₹${params.balanceRemaining.toLocaleString('en-IN')}*\n_(कृपया आगामी देय तिथि से पूर्व जमा कराएं)_`;

  if (templateId === 'compact') {
    return [
      `🧾 *शुल्क रसीद (${schoolName})*`,
      `रसीद सं: *${params.receiptNo}* | दिनांक: ${formattedDate}`,
      `छात्र: *${params.studentName}* (${params.className}-${params.section}, Adm: ${params.admissionNo})`,
      `💰 *जमा राशि:* *₹${params.amountPaid.toLocaleString('en-IN')}* (${params.paymentMethod})`,
      params.balanceRemaining <= 0
        ? `✅ *बकाया: शून्य (No Dues)*`
        : `🔴 *शेष बकाया: ₹${params.balanceRemaining.toLocaleString('en-IN')}*`,
      `📞 संपर्क: ${schoolPhone}`,
    ].join('\n');
  }

  if (templateId === 'english_standard') {
    const items = [
      `🧾 *OFFICIAL FEE RECEIPT - ${schoolName.toUpperCase()}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear Parent, we have received the school fee payment for *${params.studentName}*. Payment details:`,
      ``,
      `📄 *Receipt No:* ${params.receiptNo}`,
      `📅 *Date:* ${formattedDate}`,
      `👤 *Student Name:* *${params.studentName}*`,
      `🏫 *Class & Sec:* ${params.className} - ${params.section} ${params.rollNo ? `(Roll: ${params.rollNo})` : ''}`,
      `🎫 *Admission No:* ${params.admissionNo}`,
      `👨‍👧 *Father's Name:* ${params.fatherName || 'Parent'}`,
      ``,
      `💰 *Amount Paid:* *₹${params.amountPaid.toLocaleString('en-IN')}*`,
      `💳 *Payment Mode:* ${params.paymentMethod} ${txnLine}`.trim(),
      `🗓️ *Months Covered:* ${monthsStr}`,
    ];

    if (params.discount && params.discount > 0) {
      items.push(`🎁 *Concession/Discount:* ₹${params.discount.toLocaleString('en-IN')}`);
    }
    if (params.fine && params.fine > 0) {
      items.push(`⚠️ *Late Fine Included:* ₹${params.fine.toLocaleString('en-IN')}`);
    }

    items.push(
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 *DUE & BALANCE SUMMARY:*`,
      typeof params.totalDueBefore === 'number'
        ? `• Total Due Before Payment: ₹${params.totalDueBefore.toLocaleString('en-IN')}`
        : '',
      `• *Current Balance Due:* *₹${params.balanceRemaining.toLocaleString('en-IN')}*`,
      params.balanceRemaining <= 0
        ? `✅ All dues are cleared. Thank you!`
        : `📌 Kindly clear the pending balance by the due date.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `_This is a computer-generated official receipt._`,
      `— *Accounts Department, ${schoolName}*`,
      `📞 Office Helpline: ${schoolPhone}`
    );

    return items.filter((line) => line !== undefined && line !== '').join('\n');
  }

  // Default: Bilingual Hindi & English
  const bilingualItems = [
    `🧾 *OFFICIAL FEE RECEIPT (शुल्क रसीद)*`,
    `🏫 *${schoolName}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `प्रिय अभिभावक, *${params.studentName}* की विद्यालय शुल्क प्राप्ति की रसीद दर्ज हो गई है।`,
    ``,
    `📄 *रसीद सं. (Receipt No):* *${params.receiptNo}*`,
    `📅 *दिनांक (Date):* ${formattedDate}`,
    `👤 *छात्र का नाम:* *${params.studentName}*`,
    `🏫 *कक्षा (Class):* ${params.className} - ${params.section} ${params.rollNo ? `(अनुक्रमांक: ${params.rollNo})` : ''}`.trim(),
    `🎫 *प्रवेश सं. (Adm No):* ${params.admissionNo}`,
    `👨‍👧 *पिता का नाम:* ${params.fatherName || 'अभिभावक'}`,
    ``,
    `💰 *जमा की गई राशि (Amount Paid):* *₹${params.amountPaid.toLocaleString('en-IN')}*`,
    `💳 *भुगतान माध्यम (Mode):* ${params.paymentMethod} ${txnLine}`.trim(),
    `🗓️ *शुल्क माह (Months Paid):* ${monthsStr}`,
  ];

  if (discountLine) bilingualItems.push(discountLine.trim());
  if (fineLine) bilingualItems.push(fineLine.trim());

  bilingualItems.push(
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *बकाया शुल्क स्थिति (Fee Due Status):*`,
    typeof params.totalDueBefore === 'number'
      ? `• इस भुगतान से पूर्व कुल बकाया: ₹${params.totalDueBefore.toLocaleString('en-IN')}`
      : '',
    `• इस रसीद में जमा: ₹${params.amountPaid.toLocaleString('en-IN')}`,
    params.discount && params.discount > 0
      ? `• छूट / रियायत: ₹${params.discount.toLocaleString('en-IN')}`
      : '',
    `• *वर्तमान शेष बकाया (Remaining Due):* *₹${params.balanceRemaining.toLocaleString('en-IN')}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    balanceStatus,
    ``,
    `_यह विद्यालय का आधिकारिक कंप्यूटर जनरेटेड शुल्क प्रमाण पत्र है।_`,
    `— *लेखा विभाग, ${schoolName}*`,
    `📞 संपर्क / पूछताछ: ${schoolPhone}`
  );

  return bilingualItems.filter((line) => line !== undefined && line !== '').join('\n');
}

/**
 * Generates direct WhatsApp URL for sending a fee receipt to parent.
 */
export function generateFeeReceiptWhatsAppUrl(
  phone: string,
  params: FeeReceiptWhatsAppParams,
  templateId: FeeReceiptWhatsAppTemplateId = 'hindi_standard'
): string {
  const sanitized = cleanPhoneNumber(phone);
  const message = formatFeeReceiptWhatsAppMessage(params, templateId);
  return generateWhatsAppUrl(sanitized, message);
}

/**
 * Safely encodes a URI component, guaranteeing that invalid/unpaired surrogate
 * halves (which throw 'URIError: URI malformed' in standard encodeURIComponent)
 * are sanitized before encoding.
 */
export function safeEncodeURIComponent(str: string): string {
  if (!str) return '';
  try {
    const wellFormed =
      typeof (str as any).toWellFormed === 'function' ? (str as any).toWellFormed() : str;
    return encodeURIComponent(wellFormed);
  } catch {
    try {
      const sanitized = str.replace(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
        ''
      );
      return encodeURIComponent(sanitized);
    } catch {
      return encodeURI(str.replace(/[^\x00-\x7F]/g, ''));
    }
  }
}

/**
 * Safely decodes a URI component without throwing URIError.
 */
export function safeDecodeURIComponent(str: string): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return unescape(str);
    } catch {
      return str;
    }
  }
}

/**
 * Generates official universal WhatsApp click-to-chat URL.
 * Uses api.whatsapp.com/send/ which is the most reliable endpoint across mobile WhatsApp apps
 * (Android and iOS) and desktop browsers, avoiding intermediary wa.me redirect delays.
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const sanitized = cleanPhoneNumber(phone);
  const encoded = safeEncodeURIComponent(message);
  if (sanitized) {
    return `https://api.whatsapp.com/send/?phone=${sanitized}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send/?text=${encoded}`;
}

/**
 * Generates direct native WhatsApp mobile app deep link (whatsapp://).
 * On mobile devices, this directly triggers the installed WhatsApp app without opening a browser tab.
 */
export function generateWhatsAppAppUrl(phone: string, message: string): string {
  const sanitized = cleanPhoneNumber(phone);
  const encoded = safeEncodeURIComponent(message);
  if (sanitized) {
    return `whatsapp://send?phone=${sanitized}&text=${encoded}`;
  }
  return `whatsapp://send?text=${encoded}`;
}

/**
 * Generates direct WhatsApp Web URL for desktop/laptop browsers.
 */
export function generateWhatsAppWebUrl(phone: string, message: string): string {
  const sanitized = cleanPhoneNumber(phone);
  const encoded = safeEncodeURIComponent(message);
  if (sanitized) {
    return `https://web.whatsapp.com/send?phone=${sanitized}&text=${encoded}`;
  }
  return `https://web.whatsapp.com/send?text=${encoded}`;
}

/**
 * Generates wa.me universal short URL as alternative fallback.
 * Works cleanly on both Mobile (opens app) and Desktop (opens Web).
 */
export function generateWhatsAppShortUrl(phone: string, message: string): string {
  const sanitized = cleanPhoneNumber(phone);
  const encoded = safeEncodeURIComponent(message);
  if (sanitized) {
    return `https://wa.me/${sanitized}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export interface DispatchMessageResult {
  success: boolean;
  popupBlocked: boolean;
  channel: 'whatsapp' | 'sms';
  url: string;
}

/**
 * Checks if the current client is a mobile device (Android/iOS).
 */
export function isMobileDevice(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

/**
 * Normalizes a phone number specifically for Cellular SMS & RFC 5724 URI scheme.
 * Ensures the international +91 prefix (E.164) is included so carrier SIM apps and
 * OS messaging apps (Google Messages, Samsung, Apple Messages) do not reject 
 * the number with "Invalid recipient" or "Message not sent".
 */
export function formatPhoneForSms(phone: string, defaultCountryCode = '91'): string {
  if (!phone) return '';
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Remove leading 00 international prefix
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Handle leading trunk zero with country code (e.g. 9109415...)
  if (digits.startsWith('910') && digits.length === 13) {
    digits = '91' + digits.substring(3);
  }

  // Handle single trunk zero (e.g. 09415...)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Standard Indian 10-digit mobile number
  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  // 12-digit number already prefixed with 91
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Strips WhatsApp markdown, currency symbols, and emojis to produce 100% clean,
 * GSM 7-bit compliant SMS text that won't fail on carrier gateways or corrupt into '?'.
 */
export function cleanTextForSms(text: string): string {
  if (!text) return '';
  return text
    // Replace currency symbols with ASCII
    .replace(/₹/g, 'Rs. ')
    .replace(/\$/g, 'USD ')
    // Replace WhatsApp markdown asterisks, backticks, underscores, tildes
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/_/g, '')
    .replace(/~/g, '')
    // Replace unicode list bullets and box-drawing lines that corrupt SMS encoding
    .replace(/[•●▪]/gu, '- ')
    .replace(/[─━═—–]/gu, '-')
    // Replace status icons with text equivalents
    .replace(/[✅✓✔]/gu, '[OK]')
    .replace(/[❌✖]/gu, '[X]')
    .replace(/[⚠️❗]/gu, '[!]')
    .replace(/[🔴]/gu, '[*]')
    // Remove decorative emojis safely using unicode property escape with 'u' flag
    .replace(/\p{Extended_Pictographic}/gu, '')
    // Normalize excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts phone number and message text from various WhatsApp URL formats.
 */
export function extractWhatsAppParams(url: string): { phone: string; text: string } {
  let phone = '';
  let text = '';
  if (!url) return { phone, text };
  try {
    const phoneMatch = url.match(/[?&]phone=([^&]+)/) || url.match(/wa\.me\/([0-9+]+)/);
    if (phoneMatch) {
      phone = cleanPhoneNumber(phoneMatch[1]);
    }
    const textMatch = url.match(/[?&]text=([^&]+)/) || url.match(/[?&]body=([^&]+)/);
    if (textMatch) {
      text = safeDecodeURIComponent(textMatch[1]);
    }
  } catch {}
  return { phone, text };
}

/**
 * Returns the optimal WhatsApp URL:
 * - On mobile devices (Android / iOS): generates direct native app URL (whatsapp://send?phone=...)
 *   which immediately opens the WhatsApp application, bypassing intermediary web browser pages.
 * - On desktop browsers: generates universal link (https://api.whatsapp.com/send/?...) or Web URL.
 */
export function getSmartWhatsAppUrl(phone: string, message: string, preferDirectApp = true): string {
  const isMobile = isMobileDevice();
  if (preferDirectApp && (isMobile || preferDirectApp)) {
    return generateWhatsAppAppUrl(phone, message);
  }
  return generateWhatsAppUrl(phone, message);
}

/**
 * Safely dispatches a WhatsApp or SMS intent without navigating, unloading,
 * or refreshing the current Single Page Application.
 *
 * CRITICAL FIXES APPLIED:
 * 1. DIRECT MOBILE APP LAUNCH: On mobile devices (Android/iOS) or when direct-app mode is requested,
 *    uses native whatsapp://send?phone=... deep linking via anchor execution. This prevents
 *    the browser from opening api.whatsapp.com with "Continue to WhatsApp? This site wants to open WhatsApp"
 *    and the intermediate green "Open app" landing page.
 * 2. Works reliably on both Android/iOS phones and Desktop computers.
 * 3. Copies the message text to clipboard automatically as an instant safety net.
 * 4. NEVER uses target="_blank" for custom schemes (sms: or whatsapp:) which causes about:blank#blocked errors.
 */
export function dispatchSafeMessage(
  url: string,
  channel: 'whatsapp' | 'sms' = 'whatsapp',
  messageTextToCopy?: string,
  options?: {
    forceMode?: 'direct-app' | 'browser' | 'auto';
  }
): DispatchMessageResult {
  if (!url) {
    return { success: false, popupBlocked: false, channel, url: '' };
  }

  // If text was not explicitly passed, extract from URL params (body= or text=)
  let textToCopy = messageTextToCopy;
  if (!textToCopy) {
    if (url.includes('body=')) {
      try {
        const raw = url.split('body=')[1]?.split('&')[0];
        if (raw) textToCopy = safeDecodeURIComponent(raw);
      } catch {}
    } else if (url.includes('text=')) {
      try {
        const raw = url.split('text=')[1]?.split('&')[0];
        if (raw) textToCopy = safeDecodeURIComponent(raw);
      } catch {}
    }
  }

  // Preemptively copy text to clipboard as an immediate safety net
  if (textToCopy && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    } catch {}
  }

  if (channel === 'sms') {
    try {
      // CRITICAL: NEVER set target="_blank" for sms: protocol.
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 500);
      return { success: true, popupBlocked: false, channel: 'sms', url };
    } catch {
      return { success: false, popupBlocked: true, channel: 'sms', url };
    }
  }

  // Channel: WhatsApp
  const isMobile = isMobileDevice();
  const isExplicitDirectScheme = url.startsWith('whatsapp://');
  const isExplicitWebUrl = url.includes('web.whatsapp.com');
  const requestedMode = options?.forceMode || 'auto';

  // Determine if direct native app launch (whatsapp://) should be used:
  // 1. If URL is already whatsapp://
  // 2. If forceMode is 'direct-app'
  // 3. If on mobile device AND mode is not explicitly 'browser' AND url is not web.whatsapp.com
  const shouldUseDirectApp =
    isExplicitDirectScheme ||
    requestedMode === 'direct-app' ||
    (isMobile && requestedMode !== 'browser' && !isExplicitWebUrl);

  if (shouldUseDirectApp) {
    let directAppUrl = url;
    if (!directAppUrl.startsWith('whatsapp://')) {
      const { phone, text } = extractWhatsAppParams(url);
      const effectiveText = textToCopy || text;
      directAppUrl = generateWhatsAppAppUrl(phone, effectiveText);
    }

    try {
      // Use hidden anchor click to directly trigger OS intent without opening a new browser tab
      const link = document.createElement('a');
      link.href = directAppUrl;
      link.style.display = 'none';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 500);

      return {
        success: true,
        popupBlocked: false,
        channel: 'whatsapp',
        url: directAppUrl,
      };
    } catch (err) {
      console.error('Failed to trigger native WhatsApp deep link via anchor click:', err);
    }
  }

  // Desktop or fallback browser flow
  let targetUrl = url;
  if (targetUrl.includes('api.whatsapp.com/send?')) {
    targetUrl = targetUrl.replace('api.whatsapp.com/send?', 'api.whatsapp.com/send/?');
  }

  let opened = false;

  // Standard window.open with target '_blank' for desktop browsers
  try {
    const win = window.open(targetUrl, '_blank');
    if (win) {
      opened = true;
      try {
        win.opener = null;
      } catch {}
    }
  } catch (err) {
    console.error('Failed to open WhatsApp window with _blank:', err);
    opened = false;
  }

  return {
    success: opened,
    popupBlocked: !opened,
    channel: 'whatsapp',
    url: targetUrl,
  };
}

export type SmsTemplateId =
  | 'sms_headwise'
  | 'sms_standard'
  | 'sms_urgent'
  | 'sms_exam'
  | 'sms_hindi'
  | 'sms_short';

export interface SmsTemplate {
  id: SmsTemplateId;
  name: string;
  tag: string;
  description: string;
  templateText: string;
}

export const SMS_FEE_TEMPLATES: SmsTemplate[] = [
  {
    id: 'sms_headwise',
    name: 'All Heads Itemized Fee SMS (मद-वार SMS)',
    tag: 'All Heads',
    description: 'Concise SMS with all fee heads breakdown (Tuition, Adm, Reg, Exam, Transport, Prev Due).',
    templateText: `Fee Due Notice: {student_name} (Class {class_name}-{section}, Adm #{admission_no}). Pending Fee: Rs.{due_amount} [Tuition: Rs.{tuition_fee}, Adm: Rs.{admission_fee}, Reg: Rs.{registration_fee}, Exam: Rs.{exam_fee}, Transport: Rs.{convey_fee}, Prev Due: Rs.{previous_due}, Fine: Rs.{late_fine}]. Due Date: {due_date}. Pay via UPI: {school_upi} or school fee counter. - {school_name}, Helpline: {school_phone}`,
  },
  {
    id: 'sms_standard',
    name: 'Standard Fee SMS (With UPI)',
    tag: 'Recommended',
    description: 'Concise, clean text message with exact dues, due date and UPI payment ID.',
    templateText: `Fee Due Alert: Dear Parent of {student_name} (Class {class_name}-{section}, Adm #{admission_no}), pending school fee of Rs.{due_amount} is due by {due_date}. Please pay via UPI: {school_upi} or deposit at school fee counter. - {school_name}, Helpline: {school_phone}`,
  },
  {
    id: 'sms_urgent',
    name: 'Urgent Overdue Notice',
    tag: 'Urgent',
    description: 'Firm notification for overdue fees to avoid late fine surcharges.',
    templateText: `URGENT NOTICE: School fee dues of Rs.{due_amount} for {student_name} (Class {class_name}-{section}) are OVERDUE. Kindly clear on or before {due_date} via UPI: {school_upi} to avoid late penalty. - {school_name}, Ph: {school_phone}`,
  },
  {
    id: 'sms_exam',
    name: 'Admit Card Clearance SMS',
    tag: 'Exams',
    description: 'Reminder for clearing dues before issuing term exam admit cards.',
    templateText: `Exam Notice: School fee balance of Rs.{due_amount} for {student_name} (Adm #{admission_no}) must be cleared by {due_date} for Exam Admit Card issuance. Pay via UPI: {school_upi}. - {school_name}`,
  },
  {
    id: 'sms_hindi',
    name: 'Hindi Fee SMS (हिंदी संदेश)',
    tag: 'Hindi',
    description: 'Hindi language text message for parents with UPI payment details.',
    templateText: `शुल्क सूचना: अभिभावक महोदय, छात्र {student_name} (कक्षा {class_name}-{section}) का बकाया शुल्क रु.{due_amount} है। कृपया {due_date} तक UPI: {school_upi} अथवा विद्यालय कार्यालय में जमा करें। - {school_name}, फोन: {school_phone}`,
  },
  {
    id: 'sms_short',
    name: 'Quick Compact SMS',
    tag: 'Short',
    description: 'Minimal characters for standard 160-char SMS gateways.',
    templateText: `{school_name}: Fee due for {student_name} (Class {class_name}) is Rs.{due_amount}. Due date: {due_date}. Pay via UPI: {school_upi}. Contact: {school_phone}`,
  },
];

/**
 * Strips WhatsApp markdown (asterisks, underscores) and cleans text for SMS.
 */
export function formatSmsMessage(templateText: string, params: FeeReminderParams): string {
  const formatted = formatFeeReminderMessage(templateText, params);
  return cleanTextForSms(formatted);
}

/**
 * Generates direct SMS intent URL for mobile & desktop SMS apps.
 * Uses formatPhoneForSms to ensure correct international +91 prefix,
 * preventing carrier "invalid recipient" rejection errors.
 */
export function generateSmsUrl(phone: string, message: string): string {
  const sanitized = formatPhoneForSms(phone);
  const cleanMsg = cleanTextForSms(message);
  const encoded = safeEncodeURIComponent(cleanMsg);
  // Standard RFC 5724 format; supports both Android and iOS
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  const separator = isApple ? '&' : '?';
  return `sms:${sanitized}${separator}body=${encoded}`;
}

/**
 * Generates direct Group SMS URL for multiple phones.
 * Deduplicates numbers, formats each with +91 international prefix,
 * and sets appropriate delimiter (; for Apple, , for Android).
 * Safe-guards URL length by limiting direct recipients in the intent to 25.
 */
export function generateGroupSmsUrl(phones: string[], message: string): string {
  const sanitizedPhones = Array.from(
    new Set(phones.map((p) => formatPhoneForSms(p)).filter(Boolean))
  );
  if (sanitizedPhones.length === 0) return '';
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  const separator = isApple ? ';' : ',';
  // Avoid URL overflow crash on mobile browsers
  const phoneList = sanitizedPhones.slice(0, 25).join(separator);
  const cleanMsg = cleanTextForSms(message);
  const encoded = safeEncodeURIComponent(cleanMsg);
  const paramChar = isApple ? '&' : '?';
  return `sms:${phoneList}${paramChar}body=${encoded}`;
}

/**
 * Generates standard Indian UPI payment deep-link.
 */
export function generateUpiPayUrl(upiId: string, payeeName: string, amount: number, note?: string): string {
  const sanitizedUpi = upiId.trim() || 'anilsingh636-2@oksbi';
  const cleanPayee = safeEncodeURIComponent(payeeName || 'School Fee');
  const cleanNote = safeEncodeURIComponent(note || `School Fee Payment`);
  return `upi://pay?pa=${sanitizedUpi}&pn=${cleanPayee}&am=${amount}&cu=INR&tn=${cleanNote}`;
}

export const SMS_NOTICE_TEMPLATES: SmsTemplate[] = [
  {
    id: 'sms_holiday' as any,
    name: 'School Holiday SMS',
    tag: 'Holiday',
    description: 'Concise holiday declaration text message for parents.',
    templateText: `Holiday Notice: School will remain CLOSED on {date} for {notice_title}. Reopens on {reopen_date}. Please check holiday revision homework. - {school_name}, Helpline: {school_phone}`,
  },
  {
    id: 'sms_event' as any,
    name: 'School Event / Function SMS',
    tag: 'Event',
    description: 'Short invitation for sports meet, annual function, or exhibition.',
    templateText: `School Event: {notice_title} scheduled on {date} at {school_name}. Parents of {student_name} (Class {class_name}-{section}) are cordially invited. Ph: {school_phone}`,
  },
  {
    id: 'sms_urgent' as any,
    name: 'Urgent Weather / Closure Alert',
    tag: 'Urgent',
    description: 'Emergency closure notification due to weather or administrative orders.',
    templateText: `URGENT NOTICE: Due to administrative orders/weather, school will remain closed on {date} ({notice_title}). Next update soon. - Principal, {school_name}`,
  },
  {
    id: 'sms_exam' as any,
    name: 'Examination Schedule SMS',
    tag: 'Exam',
    description: 'Alert regarding exam datesheet, reporting timings and admit cards.',
    templateText: `Exam Circular: {notice_title} commencing from {date} for Class {class_name}. Please ensure student punctuality and revision. - {school_name}`,
  },
  {
    id: 'sms_ptm' as any,
    name: 'Parent-Teacher Meeting (PTM) SMS',
    tag: 'PTM',
    description: 'Invitation to parent-teacher conference for progress review.',
    templateText: `PTM Notice: Parent-Teacher Meeting on {date} for {student_name} (Class {class_name}). Your presence is cordially requested. - {school_name}`,
  },
  {
    id: 'sms_short' as any,
    name: 'General School Circular SMS',
    tag: 'General',
    description: 'Quick institutional announcement with key notice summary.',
    templateText: `Notice from {school_name}: {notice_title}. {notice_content} Date: {date}. - Principal Office, Ph: {school_phone}`,
  },
];

/**
 * Replaces placeholders in the notice broadcast template.
 */
export function formatNoticeBroadcastMessage(
  templateText: string,
  params: NoticeBroadcastParams
): string {
  const formattedDate = params.date
    ? new Date(params.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const reopenFormatted = params.reopenDate
    ? new Date(params.reopenDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'As per regular school schedule';

  return templateText
    .replace(/{notice_title}/g, params.noticeTitle || 'School Announcement')
    .replace(/{notice_content}/g, params.noticeContent || '')
    .replace(/{category}/g, params.category || 'General')
    .replace(/{student_name}/g, params.studentName || 'Student')
    .replace(/{admission_no}/g, params.admissionNo || 'N/A')
    .replace(/{class_name}/g, params.className || 'All Classes')
    .replace(/{section}/g, params.section || 'A')
    .replace(/{father_name}/g, params.fatherName || 'Parent')
    .replace(/{date}/g, formattedDate)
    .replace(/{reopen_date}/g, reopenFormatted)
    .replace(/{school_name}/g, params.schoolName || 'SBSC Public School')
    .replace(/{school_phone}/g, params.schoolPhone || '+91 94150 00000');
}

/**
 * Formats notice message specifically for clean SMS text.
 */
export function formatNoticeSmsMessage(templateText: string, params: NoticeBroadcastParams): string {
  const formatted = formatNoticeBroadcastMessage(templateText, params);
  return cleanTextForSms(formatted);
}
