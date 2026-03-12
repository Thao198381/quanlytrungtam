// MÃ GOOGLE APPS SCRIPT - DÁN VÀO GOOGLE SHEETS (Mục Tiện ích mở rộng -> Apps Script)

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = ["dsgv", "dshs", "thutien", "bank", "lichhoc"];
  var data = {};
  
  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      var values = sheet.getDataRange().getValues();
      if (values.length > 0) {
        var headers = values[0];
        var rows = [];
        for (var i = 1; i < values.length; i++) {
          var row = {};
          for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = values[i][j];
          }
          rows.push(row);
        }
        data[name] = rows;
      } else {
        data[name] = [];
      }
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  var sheetName = payload.sheetName;
  var data = payload.data;
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (action === "sync_all") {
    sheet.clear();
    if (data && data.length > 0) {
      var headers = Object.keys(data[0]);
      sheet.appendRow(headers);
      var allValues = data.map(function(row) {
        return headers.map(function(h) { return row[h]; });
      });
      sheet.getRange(2, 1, allValues.length, headers.length).setValues(allValues);
    }
  }
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * HƯỚNG DẪN TRIỂN KHAI:
 * 1. Trong Google Sheets, vào Tiện ích mở rộng -> Apps Script.
 * 2. Dán toàn bộ mã này vào.
 * 3. Nhấn "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 4. Chọn loại: "Ứng dụng Web" (Web App).
 * 5. Mô tả: "Kết nối Web Quản lý Trung tâm".
 * 6. Thực thi dưới tên: "Tôi" (Me).
 * 7. Người có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 8. Nhấn "Triển khai", sau đó copy URL nhận được và dán vào Dashboard Admin trên Web.
 */
