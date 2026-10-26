# GharKhata Offline + Online Sync — Starter v1

यो package एउटा काम गर्ने **प्रारम्भिक PWA** हो: कारोबार browser को IndexedDB मा राखिन्छ, app shell offline खुल्छ, CSV/JSON export हुन्छ, र online हुँदा Google Sheets backend मा manually Sync गर्न सकिन्छ।

## समावेश
- मोबाइल/कम्प्युटर responsive web app
- Offline local transaction storage (IndexedDB)
- Dashboard, income/expense, transaction search/edit/delete
- उधारोका कारोबारको कुल सारांश
- आधारभूत कामदार सूची
- receipt image/PDF local record मा राख्ने र sync हुँदा Google Drive मा upload
- CSV export, JSON backup, print / Save PDF
- Google Sheets backend (`Transactions`, `Workers`) र shared sync key

## अति महत्त्वपूर्ण सीमाहरू
यो **पूर्ण accounting-grade release होइन**। हालको starter मा double-entry ledger, बैंक reconciliation, व्यक्ति/ऋणअनुसार amortization र ब्याज गणना, किस्ता schedule, attendance-to-wage auto-calculation, full role-based login, BS↔AD date conversion, conflict resolution UI, automatic background sync, encrypted local database, multiple-user access control र audited delete recovery पूर्ण रूपमा छैनन्। यी सुविधा चाहिँदा थप विकास/परीक्षण आवश्यक छ।
- Offline records device/browser profile मा मात्र हुन्छन्। Browser data clear गरेमा backup नभएका records हराउन सक्छन्।
- Browser बाट Google Apps Script API मा cross-origin request केही deployment/browser सेटिङमा असफल हुन सक्छ। असफल भए API URL/access policy जाँच्नुहोस्; production मा authenticated backend वा Apps Script HTML-served UI/secure API proxy राम्रो हुन्छ।
- Apps Script Web App को “Anyone” access छान्दा URL मात्रले सुरक्षा हुँदैन; key गोप्य राख्नुहोस्। संवेदनशील वास्तविक डेटा प्रयोग गर्नुअघि security review गर्नुहोस्।
- Receipt file data local browser storage मा राखिन्छ; धेरै ठूला/धेरै फाइलले browser storage सीमा छिटो भरिन सक्छ।
- Sync conflict मा पछिल्लो `UpdatedAt` भएको record प्राथमिक हुन्छ; server-side merge/versioning छैन।

## A. Google Sheets backend setup
1. Google Drive मा नयाँ Google Sheet बनाउनुहोस्; नाम `GharKhata Database` राख्नुहोस्।
2. `Extensions > Apps Script` खोल्नुहोस्।
3. त्यहाँको `Code.gs` हटाएर यस package को `Code.gs` paste गर्नुहोस्, Save गर्नुहोस्।
4. `setupGharKhataBackend` function छानेर Run गर्नुहोस्। Google permission मागेमा समीक्षा गरेर अनुमति दिनुहोस्।
5. Apps Script को **Project Settings > Script Properties** मा `GHK_SYNC_KEY` हेर्नुहोस्। Setup ले बनाएको key Logger मा पनि देखाउँछ। त्यो key गोप्य रूपमा copy गर्नुहोस्; सार्वजनिक नगर्नुहोस्।
6. `Deploy > New deployment > Select type > Web app` छान्नुहोस्। Execute as: **Me**। यस starter को साधारण browser client का लागि access “Anyone” चाहिन सक्छ। संगठनको policy ले अनुमति नदिए यस डिजाइनमा sync चल्दैन; सार्वजनिक access खोल्नुअघि जोखिम बुझ्नुहोस्।
7. Deploy गरेर `/exec` URL copy गर्नुहोस्।

## B. App लाई HTTPS hosting मा राख्ने
PWA service worker लाई प्रायः HTTPS चाहिन्छ (localhost अपवाद हो)।
1. `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.json` सबै एउटै folder मा राख्नुहोस्।
2. यी static files लाई आफूले नियन्त्रण गर्ने HTTPS static hosting मा publish गर्नुहोस् (उदाहरण: GitHub Pages वा Firebase Hosting)। Google Apps Script editor मा `index.html` मात्र राखेर service worker को पूर्ण PWA सुविधा प्राप्त हुँदैन।
3. publish URL खोल्नुहोस्। Chrome/Edge मा `Install app` वा `Add to Home Screen` प्रयोग गर्नुहोस्।
4. App को `सेटिङ` मा Web App `/exec` URL र `GHK_SYNC_KEY` राखेर Save गर्नुहोस्।
5. कारोबार थप्नुहोस्। Offline हुँदा स्थानीय रूपमा सुरक्षित हुन्छ। Internet फर्केपछि app खोल्नुहोस् र `Sync Now` थिच्नुहोस्।
6. Google Sheet को `Transactions` tab मा कारोबार जाँच्नुहोस्। Receipt files `GharKhata Receipts` Drive folder मा रहनेछन्।

## C. परीक्षण checklist
- [ ] Online हुँदा test transaction थप्ने
- [ ] Airplane mode / network बन्द गरेर अर्को test transaction थप्ने
- [ ] App बन्द/खोल्दा local records देखिने जाँच्ने
- [ ] Network फर्केपछि Sync Now
- [ ] Google Sheet मा records देखिएको जाँच्ने
- [ ] receipt upload र URL जाँच्ने
- [ ] CSV र JSON backup डाउनलोड गर्ने
- [ ] अर्को device मा app खोल्दा local records स्वतः देखिँदैनन्; Sync/backend बाट डाउनलोड सुविधा यस version मा छैन। त्यसैले यसलाई पूर्ण multi-device sync नमान्नुहोस्।

## D. सुरक्षा र backup
- `GHK_SYNC_KEY` कसैलाई नदिनुहोस्।
- संवेदनशील व्यक्तिगत/आर्थिक डेटा production मा राख्नुअघि login, roles, access controls, audit log, backups र privacy review थप्नुहोस्।
- नियमित `JSON Backup` र Google Sheet/Drive backup राख्नुहोस्।
- `Anyone` deployment प्रयोग गर्दा key चोरी भएमा अनधिकृत sync सम्भव हुन सक्छ; key leak भए Script Properties मा key बदल्नुहोस् र redeploy/clients update गर्नुहोस्.

## E. Date / Nepali calendar
Form मा AD date (`YYYY-MM-DD`) प्रयोग गरिएको छ। BS date field/conversion library энэ starter मा समावेश छैन; BS↔AD रूपान्तरणका लागि प्रमाणित Nepali calendar library र edge-case testing चाहिन्छ।
