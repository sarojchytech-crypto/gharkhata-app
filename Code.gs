/**
 * GharKhata Sync Backend (Google Apps Script)
 * Setup:
 * 1) Create a NEW Google Sheet.
 * 2) Extensions > Apps Script; replace Code.gs with this file.
 * 3) Project Settings > Script Properties: add GHK_SYNC_KEY = a long random secret.
 * 4) Run setupGharKhataBackend() once and authorize.
 * 5) Deploy > New deployment > Web app; Execute as Me; Who has access: Anyone (required by simple cross-origin client).
 *    Keep the URL private and use a long secret key. For sensitive/multi-user deployments, implement Google login/role auth instead.
 */
const GHK = { RECORDS:'Transactions', WORKERS:'Workers', PROP:'GHK_SYNC_KEY', MAX_RECEIPT_BYTES: 8*1024*1024 };
function setupGharKhataBackend(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Google Sheet बाट Extensions > Apps Script खोल्नुहोस्।');
  ensureSheet_(ss,GHK.RECORDS,['ID','Date','Type','Amount','Title','Person','Phone','Category','PaymentMode','InterestRate','DueDate','RelatedID','Note','ReceiptURL','CreatedAt','UpdatedAt','DeletedAt']);
  ensureSheet_(ss,GHK.WORKERS,['ID','Name','Phone','DailyWage','CreatedAt','UpdatedAt','DeletedAt']);
  let folder=DriveApp.getFoldersByName('GharKhata Receipts');if(!folder.hasNext())DriveApp.createFolder('GharKhata Receipts');
  if(!PropertiesService.getScriptProperties().getProperty(GHK.PROP)){
    const key=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    PropertiesService.getScriptProperties().setProperty(GHK.PROP,key);
    Logger.log('GHK_SYNC_KEY (copy it now into app Settings): '+key);
  }
  return 'GharKhata backend ready';
}
function doGet(){return json_({ok:true,service:'GharKhata Sync API',message:'Backend active. Use the GharKhata offline app to sync.'});}
function doPost(e){
  try{
    const body=JSON.parse((e.postData&&e.postData.contents)||'{}');
    const expected=PropertiesService.getScriptProperties().getProperty(GHK.PROP);
    if(!expected||!safeEqual_(String(body.key||''),expected))return json_({ok:false,error:'Invalid Sync Key'});
    if(body.action!=='sync')return json_({ok:false,error:'Unknown action'});
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    const sheet=ss.getSheetByName(GHK.RECORDS);if(!sheet)throw new Error('पहिले setupGharKhataBackend चलाउनुहोस्।');
    const values=sheet.getDataRange().getValues(),headers=values[0].map(String),idCol=headers.indexOf('ID');
    const rowById={};for(let i=1;i<values.length;i++)rowById[String(values[i][idCol])]=i+1;
    const syncedIds=[],receiptUrls={};const incoming=Array.isArray(body.records)?body.records:[];
    if(incoming.length>500)throw new Error('एक पटकमा ५०० भन्दा बढी कारोबार Sync नगर्नुहोस्।');
    const folderIt=DriveApp.getFoldersByName('GharKhata Receipts');const folder=folderIt.hasNext()?folderIt.next():DriveApp.createFolder('GharKhata Receipts');
    incoming.forEach(r=>{
      if(!r||!r.id)return;
      let receiptUrl=r.receiptUrl||'';
      if(r.receiptData&&r.receiptData.data&&!receiptUrl){
        const dataUrl=String(r.receiptData.data);const m=dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if(m){const bytes=Utilities.base64Decode(m[2]);if(bytes.length>GHK.MAX_RECEIPT_BYTES)throw new Error('रसिद ८ MB भन्दा ठूलो छ।');const blob=Utilities.newBlob(bytes,m[1],String(r.receiptData.name||'receipt').replace(/[\\/:*?"<>|]/g,'_'));const file=folder.createFile(blob);receiptUrl=file.getUrl();}
      }
      const obj={'ID':String(r.id),'Date':String(r.date||''),'Type':String(r.type||''),'Amount':Number(r.amount||0),'Title':String(r.title||''),'Person':String(r.person||''),'Phone':String(r.phone||''),'Category':String(r.category||''),'PaymentMode':String(r.paymentMode||''),'InterestRate':Number(r.interestRate||0),'DueDate':String(r.dueDate||''),'RelatedID':String(r.relatedId||''),'Note':String(r.note||''),'ReceiptURL':receiptUrl,'CreatedAt':String(r.createdAt||''),'UpdatedAt':String(r.updatedAt||new Date().toISOString()),'DeletedAt':String(r.deletedAt||'')};
      const row=headers.map(h=>obj[h]===undefined?'':obj[h]);const oldRow=rowById[String(r.id)];
      if(oldRow){const oldUpdated=String(values[oldRow-1][headers.indexOf('UpdatedAt')]||'');if(!oldUpdated||String(r.updatedAt||'')>=oldUpdated)sheet.getRange(oldRow,1,1,headers.length).setValues([row]);}
      else{sheet.appendRow(row);}
      syncedIds.push(String(r.id));if(receiptUrl)receiptUrls[String(r.id)]=receiptUrl;
    });
    return json_({ok:true,syncedIds,receiptUrls,serverTime:new Date().toISOString()});
  }catch(err){return json_({ok:false,error:String(err&&err.message||err)});}
}
function ensureSheet_(ss,name,headers){let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);if(s.getLastRow()===0)s.appendRow(headers);else{const existing=s.getRange(1,1,1,Math.max(s.getLastColumn(),headers.length)).getValues()[0];headers.forEach((h,i)=>{if(existing[i]!==h)s.getRange(1,i+1).setValue(h);});}s.setFrozenRows(1);s.getRange(1,1,1,headers.length).setFontWeight('bold');s.autoResizeColumns(1,headers.length);return s;}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function safeEqual_(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}