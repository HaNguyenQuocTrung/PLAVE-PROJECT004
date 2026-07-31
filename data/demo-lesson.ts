import type { DemoLesson } from "@/types/learning";

export const demoLesson: DemoLesson = {
  id: "grade-1-numbers-within-10",
  title: "Đếm, đọc, viết và cấu tạo số trong phạm vi 10",
  subtitle:
    "Cùng quan sát số lượng, gọi đúng tên số và tìm những phần nhỏ tạo nên một số.",
  objectives: [
    "Đếm đúng một nhóm có không quá 10 đồ vật.",
    "Đọc và viết các số từ 0 đến 10.",
    "Nhận biết số đứng trước, số đứng sau.",
    "Tách một số thành hai phần đơn giản.",
  ],
  explanation: [
    "Khi đếm, em chỉ vào từng đồ vật một lần và đọc các số theo thứ tự: 0, 1, 2, 3, …, 10.",
    "Số đọc cuối cùng cho biết nhóm có tất cả bao nhiêu đồ vật.",
    "Một số có thể được tạo từ hai phần. Chẳng hạn, 7 gồm 5 và 2 vì 5 thêm 2 là 7.",
  ],
  examples: [
    {
      title: "Ví dụ 1 — Đếm một nhóm đồ vật",
      prompt: "Có 3 bút chì màu xanh và 2 bút chì màu đỏ. Có tất cả bao nhiêu bút chì?",
      steps: [
        "Đếm ba bút chì màu xanh: 1, 2, 3.",
        "Đếm tiếp hai bút chì màu đỏ: 4, 5.",
        "Số đọc cuối cùng là 5.",
      ],
      answer: "Có tất cả 5 bút chì.",
    },
    {
      title: "Ví dụ 2 — Cấu tạo một số",
      prompt: "Số 8 gồm 6 và mấy?",
      steps: [
        "Bắt đầu từ 6.",
        "Đếm thêm: 7 là thêm 1, 8 là thêm 2.",
        "Vậy cần thêm 2 để từ 6 được 8.",
      ],
      answer: "Số 8 gồm 6 và 2.",
    },
  ],
  questions: [
    {
      id: "q1-read-four",
      type: "multiple-choice",
      prompt: "Số nào đọc là “bốn”?",
      choices: [
        { id: "q1-a", label: "A", value: "3", text: "3" },
        { id: "q1-b", label: "B", value: "4", text: "4" },
        { id: "q1-c", label: "C", value: "5", text: "5" },
        { id: "q1-d", label: "D", value: "6", text: "6" },
      ],
      correctAnswer: "4",
      explanation: [
        "Đọc từng số trong các lựa chọn.",
        "Số 4 được đọc là “bốn”.",
        "Vì vậy đáp án đúng là B — số 4.",
      ],
      skill: "Đọc số",
    },
    {
      id: "q2-next-number",
      type: "number-input",
      prompt: "Điền số còn thiếu: 0, 1, 2, 3, __.",
      correctAnswer: "4",
      explanation: [
        "Dãy số tăng thêm 1 sau mỗi bước.",
        "Sau 3, ta đếm tiếp một số là 4.",
        "Số cần điền là 4.",
      ],
      skill: "Thứ tự số",
    },
    {
      id: "q3-count-blocks",
      type: "multiple-choice",
      prompt: "Có 2 khối màu đỏ và 3 khối màu xanh. Có tất cả bao nhiêu khối?",
      choices: [
        { id: "q3-a", label: "A", value: "4", text: "4 khối" },
        { id: "q3-b", label: "B", value: "5", text: "5 khối" },
        { id: "q3-c", label: "C", value: "6", text: "6 khối" },
        { id: "q3-d", label: "D", value: "7", text: "7 khối" },
      ],
      correctAnswer: "5",
      explanation: [
        "Đếm 2 khối màu đỏ trước.",
        "Đếm tiếp 3 khối màu xanh: 3, 4, 5.",
        "Có tất cả 5 khối, nên chọn B.",
      ],
      skill: "Đếm và gộp",
    },
    {
      id: "q4-compose-seven",
      type: "number-input",
      prompt: "Số 7 gồm 5 và mấy? Hãy nhập số còn thiếu.",
      correctAnswer: "2",
      explanation: [
        "Bắt đầu từ 5.",
        "Đếm thêm 1 được 6; đếm thêm 1 lần nữa được 7.",
        "Ta đã thêm 2, nên số cần nhập là 2.",
      ],
      skill: "Cấu tạo số",
    },
    {
      id: "q5-before-ten",
      type: "multiple-choice",
      prompt: "Số nào đứng ngay trước số 10?",
      choices: [
        { id: "q5-a", label: "A", value: "7", text: "7" },
        { id: "q5-b", label: "B", value: "8", text: "8" },
        { id: "q5-c", label: "C", value: "9", text: "9" },
        { id: "q5-d", label: "D", value: "10", text: "10" },
      ],
      correctAnswer: "9",
      explanation: [
        "Đọc các số gần 10 theo thứ tự: 7, 8, 9, 10.",
        "Số nằm ngay trước 10 là 9.",
        "Vì vậy đáp án đúng là C — số 9.",
      ],
      skill: "Thứ tự số",
    },
  ],
};
