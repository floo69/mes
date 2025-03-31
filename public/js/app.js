// Main app.js for QR Scanner Attendance System

document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const attendanceData = document.getElementById("attendance-data");
  const totalScans = document.getElementById("total-scans");
  const uniqueStudents = document.getElementById("unique-students");
  const todayScans = document.getElementById("today-scans");
  const studentSearch = document.getElementById("student-search");
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");

  // Load all attendance data on page load
  fetchAttendanceData();

  // Event listeners
  searchBtn.addEventListener("click", searchStudent);
  resetBtn.addEventListener("click", resetSearch);
  studentSearch.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchStudent();
    }
  });

  // Functions
  async function fetchAttendanceData(studentId = null) {
    let url = "/api/attendance";

    if (studentId) {
      url = `/api/attendance/${studentId}`;
    }

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result.data) {
        displayAttendanceData(result.data);
        updateStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      attendanceData.innerHTML = `<tr><td colspan="4">Error loading data. Please try again.</td></tr>`;
    }
  }

  function displayAttendanceData(data) {
    if (data.length === 0) {
      attendanceData.innerHTML = `<tr><td colspan="4">No records found</td></tr>`;
      return;
    }

    let html = "";

    data.forEach((record, index) => {
      // Format the timestamp nicely
      let timestamp = new Date(record.timestamp);
      let formattedDate = timestamp.toLocaleString();

      // Truncate QR data if it's too long
      let qrData = record.qr_data || "N/A";
      if (qrData.length > 40) {
        qrData = qrData.substring(0, 40) + "...";
      }

      html += `
          <tr>
            <td>${index + 1}</td>
            <td>${record.student_id}</td>
            <td title="${record.qr_data || "N/A"}">${qrData}</td>
            <td>${formattedDate}</td>
          </tr>
        `;
    });

    attendanceData.innerHTML = html;
  }

  function updateStats(data) {
    // Total scans
    totalScans.textContent = data.length;

    // Unique students
    const uniqueStudentIds = new Set();
    data.forEach((record) => {
      if (record.student_id) {
        uniqueStudentIds.add(record.student_id);
      }
    });
    uniqueStudents.textContent = uniqueStudentIds.size;

    // Today's scans
    const today = new Date().toDateString();
    const todayScanCount = data.filter((record) => {
      const recordDate = new Date(record.timestamp).toDateString();
      return recordDate === today;
    }).length;

    todayScans.textContent = todayScanCount;
  }

  function searchStudent() {
    const studentId = studentSearch.value.trim();

    if (studentId === "") {
      alert("Please enter a student ID");
      return;
    }

    fetchAttendanceData(studentId);
  }

  function resetSearch() {
    studentSearch.value = "";
    fetchAttendanceData();
  }
});
