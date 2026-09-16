/**
 * Disrupt.com Reception Portal — Google Sheet backup (multi-tab)
 * -------------------------------------------------------------
 * Creates/updates these tabs automatically in THIS sheet:
 *   Guests, Employees, Courier, Feedback, Analytics
 * NIC photos are saved to a Drive folder ("Disrupt NIC Photos")
 * and the link is written into the Guests tab.
 *
 * SETUP (one time):
 * 1. Open your Google Sheet -> Extensions -> Apps Script.
 * 2. Delete sample code, paste ALL of this, click Save.
 * 3. Deploy -> New deployment -> type: Web app
 *      Execute as: Me    |    Who has access: Anyone
 *    Deploy, authorise access.
 * 4. Copy the Web app URL (ends with /exec).
 * 5. Portal -> Admin -> Google Sheet sync -> paste URL -> Save -> Test.
 * (If you change this code later, do Deploy -> Manage deployments -> Edit -> New version.)
 */

var PHOTO_FOLDER = 'Disrupt NIC Photos';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var type = data.type || 'guest';

    if (type === 'guest')         logGuest_(ss, data);
    else if (type === 'employee') logEmployee_(ss, data);
    else if (type === 'courier')  logCourier_(ss, data);
    else if (type === 'feedback') logFeedback_(ss, data);

    ensureAnalytics_(ss);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() { return json_({ ok: true, message: 'Disrupt reception endpoint is live.' }); }

/* ---------- tab helpers ---------- */
function tab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function logGuest_(ss, d) {
  var sh = tab_(ss, 'Guests', ['Logged at','Action','Name','NIC number','Contact',
    'Person to meet','Purpose','Campus','Visitor card','Card status','NIC status',
    'Check-in','Check-out','NIC photo']);
  var photoUrl = '';
  if (d.nicPhoto) {
    var m = String(d.nicPhoto).match(/^data:(.+);base64,(.*)$/);
    if (m) {
      var folder = getFolder_(PHOTO_FOLDER);
      var nm = (d.name || 'nic').replace(/[^\w ]+/g, '_');
      var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nm + '_' + Date.now() + '.jpg');
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = file.getUrl();
    }
  }
  sh.appendRow([new Date(), d.action||'', d.name||'', d.cnic||'', d.phone||'',
    d.personToMeet||'', d.purpose||'', d.campus||'', d.cardNumber||'', d.cardStatus||'',
    d.nicStatus||'', d.checkIn||'', d.checkOut||'', photoUrl]);
}

function logEmployee_(ss, d) {
  var sh = tab_(ss, 'Employees', ['Logged at','Code','Name','Reason','Campus','Home campus']);
  sh.appendRow([new Date(), d.code||'', d.name||'', d.reason||'', d.campus||'', d.homeCampus||'']);
}

function logCourier_(ss, d) {
  var sh = tab_(ss, 'Courier', ['Logged at','Direction','Company','Tracking','Sender/Dest',
    'Recipient','Logged by','Note','Status','Campus']);
  sh.appendRow([new Date(), d.direction||'', d.company||'', d.tracking||'', d.party||'',
    d.recipient||'', d.receivedBy||'', d.note||'', d.status||'', d.campus||'']);
}

function logFeedback_(ss, d) {
  var sh = tab_(ss, 'Feedback', ['Logged at','Rating','Comment','Name','Campus']);
  sh.appendRow([new Date(), d.rating||'', d.comment||'', d.name||'', d.campus||'']);
}

/* ---------- analytics (live formulas) ---------- */
function ensureAnalytics_(ss) {
  var sh = ss.getSheetByName('Analytics');
  if (sh) return;                       // build once; formulas stay live
  sh = ss.insertSheet('Analytics');
  var M = '(EOMONTH(TODAY(),-1)+1)';    // first day of this month
  var rows = [
    ['Metric', 'This month', 'All time'],
    ['Guest visits',       '=COUNTIFS(Guests!A2:A,">="&'+M+',Guests!B2:B,"entry")', '=COUNTIF(Guests!B2:B,"entry")'],
    ['Guest check-outs',   '=COUNTIFS(Guests!A2:A,">="&'+M+',Guests!B2:B,"checkout")', '=COUNTIF(Guests!B2:B,"checkout")'],
    ['Employee entries',   '=COUNTIFS(Employees!A2:A,">="&'+M+')', '=COUNTA(Employees!A2:A)'],
    ['  – Card lost',      '=COUNTIFS(Employees!D2:D,"Card Lost",Employees!A2:A,">="&'+M+')', '=COUNTIF(Employees!D2:D,"Card Lost")'],
    ['  – Card forgot',    '=COUNTIFS(Employees!D2:D,"Card Forgot",Employees!A2:A,">="&'+M+')', '=COUNTIF(Employees!D2:D,"Card Forgot")'],
    ['Couriers',           '=COUNTIFS(Courier!A2:A,">="&'+M+')', '=COUNTA(Courier!A2:A)'],
    ['  – Incoming',       '=COUNTIFS(Courier!B2:B,"inbound",Courier!A2:A,">="&'+M+')', '=COUNTIF(Courier!B2:B,"inbound")'],
    ['  – Outgoing',       '=COUNTIFS(Courier!B2:B,"outbound",Courier!A2:A,">="&'+M+')', '=COUNTIF(Courier!B2:B,"outbound")'],
    ['Feedback responses', '=COUNTIFS(Feedback!A2:A,">="&'+M+')', '=COUNTA(Feedback!A2:A)'],
    ['Avg feedback rating','=IFERROR(ROUND(AVERAGEIFS(Feedback!B2:B,Feedback!A2:A,">="&'+M+'),2),0)', '=IFERROR(ROUND(AVERAGE(Feedback!B2:B),2),0)']
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  sh.setColumnWidth(1, 200);
  sh.setFrozenRows(1);
}

/* ---------- misc ---------- */
function getFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
