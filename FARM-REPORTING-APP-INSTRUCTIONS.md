# Farm Reporting App - Build Instructions

## Overview

A Progressive Web App (PWA) for farm reporting and control, featuring:
- **Fertilizer Stock Control** - Track fertilizer inventory across farms
- **Milk Production** - Daily cow milk production records
- **Feed Tracking** - Roughage, Meal, and Grass consumption

Built using the same architecture as Oostagri PO:
- React 18 (no build step, inline Babel)
- Google Sheets as database
- Google Apps Script as API
- PWA with offline support
- Financial year: March to February

---

## 1. Google Sheets Structure

Create a new Google Spreadsheet with these tabs:

### Tab: Users
| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| Name | Code | Initials | Role | Email | Active |
| John Smith | 1234 | JS | management | john@farm.com | Yes |
| Jane Doe | 5678 | JD | user | jane@farm.com | Yes |

### Tab: Farms
| Column A | Column B |
|----------|----------|
| Name | Active |
| Oosplaas | Yes |
| Wesplaas | Yes |
| Noordplaas | Yes |

### Tab: Fertilizer Types
| Column A | Column B | Column C |
|----------|----------|----------|
| ID | Name | Active |
| 1 | Urea (46%) | Yes |
| 2 | LAN (28%) | Yes |
| 3 | MAP | Yes |
| 4 | KCL | Yes |
| 5 | Superphosphate | Yes |
| 6 | 2:3:4 (30) | Yes |
| 7 | 3:2:1 (25) | Yes |

### Tab: Feed Types
| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| ID | Name | Category | Active |
| 1 | Lucerne Hay | Roughage | Yes |
| 2 | Oat Hay | Roughage | Yes |
| 3 | Maize Silage | Roughage | Yes |
| 4 | Dairy Meal 16% | Meal | Yes |
| 5 | Production Pellets | Meal | Yes |
| 6 | Kikuyu | Grass | Yes |
| 7 | Ryegrass | Grass | Yes |

### Tab: Cow Groups
| Column A | Column B | Column C |
|----------|----------|----------|
| ID | Name | Active |
| 1 | High Producers | Yes |
| 2 | Medium Producers | Yes |
| 3 | Dry Cows | Yes |
| 4 | Heifers | Yes |

### Tab: Fertilizer Stock
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| ID | Date | Farm | Fertilizer Type | Transaction | Quantity (kg) | Balance | Submitted By | Notes |
| FS001 | 2024-03-15 | Oosplaas | Urea (46%) | IN | 5000 | 5000 | JS | Delivery from supplier |
| FS002 | 2024-03-20 | Oosplaas | Urea (46%) | OUT | 200 | 4800 | JD | Applied to Block A |

### Tab: Milk Production
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| ID | Date | Farm | Milking | Cow Group | Cow Count | Liters | Submitted By | Notes |
| MP001 | 2024-03-15 | Oosplaas | Morning | High Producers | 45 | 1350 | JS | Normal production |
| MP002 | 2024-03-15 | Oosplaas | Afternoon | High Producers | 45 | 1125 | JS | |

### Tab: Feed Records
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| ID | Date | Farm | Feed Type | Category | Cow Group | Quantity (kg) | Submitted By | Notes |
| FR001 | 2024-03-15 | Oosplaas | Lucerne Hay | Roughage | High Producers | 450 | JS | Morning feed |
| FR002 | 2024-03-15 | Oosplaas | Dairy Meal 16% | Meal | High Producers | 200 | JS | |

---

## 2. Google Apps Script

Create new Apps Script (Extensions → Apps Script) and paste:

```javascript
// ============================================================
// FARM REPORTING APP - GOOGLE APPS SCRIPT
// ============================================================

function doGet(e) {
  const action = e.parameter.action;

  try {
    switch(action) {
      case 'getLookups':
        return jsonResponse(getLookups());

      case 'getFertilizerStock':
        return jsonResponse(getFertilizerStock(e.parameter));

      case 'addFertilizerStock':
        return jsonResponse(addFertilizerStock(JSON.parse(e.parameter.data)));

      case 'getMilkProduction':
        return jsonResponse(getMilkProduction(e.parameter));

      case 'addMilkProduction':
        return jsonResponse(addMilkProduction(JSON.parse(e.parameter.data)));

      case 'getFeedRecords':
        return jsonResponse(getFeedRecords(e.parameter));

      case 'addFeedRecord':
        return jsonResponse(addFeedRecord(JSON.parse(e.parameter.data)));

      case 'getReportData':
        return jsonResponse(getReportData(e.parameter));

      case 'sendCode':
        return jsonResponse(sendLoginCode(e.parameter.email, e.parameter.name, e.parameter.code));

      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// LOOKUP DATA
// ============================================================
function getLookups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const isActive = (val) => val === 'Yes' || val === 'yes' || val === true;

  // Users
  const users = [];
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet) {
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1] && isActive(data[i][5])) {
        users.push({
          name: data[i][0].toString().trim(),
          code: data[i][1].toString().trim(),
          initials: data[i][2] ? data[i][2].toString().trim() : '',
          role: data[i][3] ? data[i][3].toString().trim().toLowerCase() : 'user',
          email: data[i][4] ? data[i][4].toString().trim() : ''
        });
      }
    }
  }

  // Farms
  const farms = [];
  const farmsSheet = ss.getSheetByName('Farms');
  if (farmsSheet) {
    const data = farmsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && isActive(data[i][1])) {
        farms.push(data[i][0].toString().trim());
      }
    }
  }

  // Fertilizer Types
  const fertilizerTypes = [];
  const fertSheet = ss.getSheetByName('Fertilizer Types');
  if (fertSheet) {
    const data = fertSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && isActive(data[i][2])) {
        fertilizerTypes.push({ id: data[i][0].toString(), name: data[i][1].toString().trim() });
      }
    }
  }

  // Feed Types
  const feedTypes = [];
  const feedSheet = ss.getSheetByName('Feed Types');
  if (feedSheet) {
    const data = feedSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && isActive(data[i][3])) {
        feedTypes.push({
          id: data[i][0].toString(),
          name: data[i][1].toString().trim(),
          category: data[i][2].toString().trim()
        });
      }
    }
  }

  // Cow Groups
  const cowGroups = [];
  const cowSheet = ss.getSheetByName('Cow Groups');
  if (cowSheet) {
    const data = cowSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && isActive(data[i][2])) {
        cowGroups.push({ id: data[i][0].toString(), name: data[i][1].toString().trim() });
      }
    }
  }

  return {
    success: true,
    lookups: {
      users: users.sort((a, b) => a.name.localeCompare(b.name)),
      farms: farms.sort(),
      fertilizerTypes: fertilizerTypes.sort((a, b) => a.name.localeCompare(b.name)),
      feedTypes: feedTypes.sort((a, b) => a.name.localeCompare(b.name)),
      cowGroups: cowGroups.sort((a, b) => a.name.localeCompare(b.name))
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// FERTILIZER STOCK
// ============================================================
function getFertilizerStock(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Fertilizer Stock');
  if (!sheet) return { success: false, error: 'Fertilizer Stock sheet not found' };

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      records.push({
        id: data[i][0],
        date: data[i][1],
        farm: data[i][2],
        fertilizerType: data[i][3],
        transaction: data[i][4],
        quantity: data[i][5],
        balance: data[i][6],
        submittedBy: data[i][7],
        notes: data[i][8] || ''
      });
    }
  }

  return { success: true, records: records };
}

function addFertilizerStock(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Fertilizer Stock');
  if (!sheet) return { success: false, error: 'Fertilizer Stock sheet not found' };

  // Generate ID
  const allData = sheet.getDataRange().getValues();
  const lastId = allData.length > 1 ? parseInt(allData[allData.length - 1][0].replace('FS', '')) : 0;
  const newId = 'FS' + String(lastId + 1).padStart(3, '0');

  // Calculate new balance
  let balance = 0;
  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][2] === data.farm && allData[i][3] === data.fertilizerType) {
      balance = allData[i][6];
      break;
    }
  }
  balance = data.transaction === 'IN' ? balance + data.quantity : balance - data.quantity;

  sheet.appendRow([
    newId,
    data.date,
    data.farm,
    data.fertilizerType,
    data.transaction,
    data.quantity,
    balance,
    data.submittedBy,
    data.notes || ''
  ]);

  return { success: true, id: newId, balance: balance };
}

// ============================================================
// MILK PRODUCTION
// ============================================================
function getMilkProduction(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Milk Production');
  if (!sheet) return { success: false, error: 'Milk Production sheet not found' };

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      records.push({
        id: data[i][0],
        date: data[i][1],
        farm: data[i][2],
        milking: data[i][3],
        cowGroup: data[i][4],
        cowCount: data[i][5],
        liters: data[i][6],
        submittedBy: data[i][7],
        notes: data[i][8] || ''
      });
    }
  }

  return { success: true, records: records };
}

function addMilkProduction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Milk Production');
  if (!sheet) return { success: false, error: 'Milk Production sheet not found' };

  const allData = sheet.getDataRange().getValues();
  const lastId = allData.length > 1 ? parseInt(allData[allData.length - 1][0].replace('MP', '')) : 0;
  const newId = 'MP' + String(lastId + 1).padStart(3, '0');

  sheet.appendRow([
    newId,
    data.date,
    data.farm,
    data.milking,
    data.cowGroup,
    data.cowCount,
    data.liters,
    data.submittedBy,
    data.notes || ''
  ]);

  return { success: true, id: newId };
}

// ============================================================
// FEED RECORDS
// ============================================================
function getFeedRecords(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Feed Records');
  if (!sheet) return { success: false, error: 'Feed Records sheet not found' };

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      records.push({
        id: data[i][0],
        date: data[i][1],
        farm: data[i][2],
        feedType: data[i][3],
        category: data[i][4],
        cowGroup: data[i][5],
        quantity: data[i][6],
        submittedBy: data[i][7],
        notes: data[i][8] || ''
      });
    }
  }

  return { success: true, records: records };
}

function addFeedRecord(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Feed Records');
  if (!sheet) return { success: false, error: 'Feed Records sheet not found' };

  const allData = sheet.getDataRange().getValues();
  const lastId = allData.length > 1 ? parseInt(allData[allData.length - 1][0].replace('FR', '')) : 0;
  const newId = 'FR' + String(lastId + 1).padStart(3, '0');

  sheet.appendRow([
    newId,
    data.date,
    data.farm,
    data.feedType,
    data.category,
    data.cowGroup,
    data.quantity,
    data.submittedBy,
    data.notes || ''
  ]);

  return { success: true, id: newId };
}

// ============================================================
// REPORT DATA (For Charts)
// ============================================================
function getReportData(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportType = params.type;
  const startDate = params.startDate ? new Date(params.startDate) : null;
  const endDate = params.endDate ? new Date(params.endDate) : null;
  const farm = params.farm || null;

  let data = [];

  if (reportType === 'milk') {
    const sheet = ss.getSheetByName('Milk Production');
    if (sheet) {
      const rawData = sheet.getDataRange().getValues();
      for (let i = 1; i < rawData.length; i++) {
        const recordDate = new Date(rawData[i][1]);
        if (rawData[i][0] &&
            (!startDate || recordDate >= startDate) &&
            (!endDate || recordDate <= endDate) &&
            (!farm || rawData[i][2] === farm)) {
          data.push({
            date: rawData[i][1],
            farm: rawData[i][2],
            milking: rawData[i][3],
            cowGroup: rawData[i][4],
            cowCount: rawData[i][5],
            liters: rawData[i][6]
          });
        }
      }
    }
  } else if (reportType === 'feed') {
    const sheet = ss.getSheetByName('Feed Records');
    if (sheet) {
      const rawData = sheet.getDataRange().getValues();
      for (let i = 1; i < rawData.length; i++) {
        const recordDate = new Date(rawData[i][1]);
        if (rawData[i][0] &&
            (!startDate || recordDate >= startDate) &&
            (!endDate || recordDate <= endDate) &&
            (!farm || rawData[i][2] === farm)) {
          data.push({
            date: rawData[i][1],
            farm: rawData[i][2],
            feedType: rawData[i][3],
            category: rawData[i][4],
            cowGroup: rawData[i][5],
            quantity: rawData[i][6]
          });
        }
      }
    }
  } else if (reportType === 'fertilizer') {
    const sheet = ss.getSheetByName('Fertilizer Stock');
    if (sheet) {
      const rawData = sheet.getDataRange().getValues();
      for (let i = 1; i < rawData.length; i++) {
        const recordDate = new Date(rawData[i][1]);
        if (rawData[i][0] &&
            (!startDate || recordDate >= startDate) &&
            (!endDate || recordDate <= endDate) &&
            (!farm || rawData[i][2] === farm)) {
          data.push({
            date: rawData[i][1],
            farm: rawData[i][2],
            fertilizerType: rawData[i][3],
            transaction: rawData[i][4],
            quantity: rawData[i][5],
            balance: rawData[i][6]
          });
        }
      }
    }
  }

  return { success: true, data: data, reportType: reportType };
}

// ============================================================
// EMAIL LOGIN CODE
// ============================================================
function sendLoginCode(email, name, code) {
  try {
    MailApp.sendEmail(email, 'Your Farm Reports Login Code',
      `Hi ${name},\n\nYour login code is: ${code}\n\nRegards,\nFarm Reports System`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
```

After pasting:
1. Click **Deploy → New deployment**
2. Select **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy** and copy the URL

---

## 3. Financial Year Helper (March - February)

Add this utility to your React app:

```javascript
// Financial year utilities (March to February)
const getFinancialYear = (date) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  // If March (2) or later, FY starts this year
  // If Jan/Feb, FY started previous year
  return month >= 2 ? year : year - 1;
};

const getFinancialYearRange = (fyStartYear) => {
  return {
    start: new Date(fyStartYear, 2, 1), // March 1
    end: new Date(fyStartYear + 1, 1, 28) // Feb 28/29
  };
};

const getCurrentFinancialYear = () => {
  return getFinancialYear(new Date());
};

const getFinancialMonths = () => [
  { month: 2, name: 'March' },
  { month: 3, name: 'April' },
  { month: 4, name: 'May' },
  { month: 5, name: 'June' },
  { month: 6, name: 'July' },
  { month: 7, name: 'August' },
  { month: 8, name: 'September' },
  { month: 9, name: 'October' },
  { month: 10, name: 'November' },
  { month: 11, name: 'December' },
  { month: 0, name: 'January' },
  { month: 1, name: 'February' }
];
```

---

## 4. Chart Library

Use **Chart.js** for graphs. Add to your HTML head:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Example chart components:

```javascript
// Milk Production Line Chart (Month over Month)
const MilkProductionChart = ({ data, financialYear }) => {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();

    const months = getFinancialMonths();
    const fyRange = getFinancialYearRange(financialYear);

    // Aggregate data by month
    const monthlyData = months.map(m => {
      const monthRecords = data.filter(d => {
        const date = new Date(d.date);
        return date.getMonth() === m.month &&
               date >= fyRange.start &&
               date <= fyRange.end;
      });
      return monthRecords.reduce((sum, r) => sum + r.liters, 0);
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: months.map(m => m.name),
        datasets: [{
          label: 'Milk Production (Liters)',
          data: monthlyData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Milk Production FY ${financialYear}/${financialYear + 1}`
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, financialYear]);

  return <canvas ref={canvasRef}></canvas>;
};

// Feed Consumption Bar Chart (by Category)
const FeedConsumptionChart = ({ data, financialYear }) => {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();

    const months = getFinancialMonths();
    const fyRange = getFinancialYearRange(financialYear);
    const categories = ['Roughage', 'Meal', 'Grass'];
    const colors = {
      'Roughage': '#10B981',
      'Meal': '#F59E0B',
      'Grass': '#6366F1'
    };

    const datasets = categories.map(cat => ({
      label: cat,
      data: months.map(m => {
        const monthRecords = data.filter(d => {
          const date = new Date(d.date);
          return date.getMonth() === m.month &&
                 d.category === cat &&
                 date >= fyRange.start &&
                 date <= fyRange.end;
        });
        return monthRecords.reduce((sum, r) => sum + r.quantity, 0);
      }),
      backgroundColor: colors[cat]
    }));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: months.map(m => m.name),
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Feed Consumption FY ${financialYear}/${financialYear + 1}`
          }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, financialYear]);

  return <canvas ref={canvasRef}></canvas>;
};

// Fertilizer Stock Doughnut Chart
const FertilizerStockChart = ({ data }) => {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();

    // Get latest balance per fertilizer type
    const balances = {};
    data.forEach(d => {
      balances[d.fertilizerType] = d.balance;
    });

    const labels = Object.keys(balances);
    const values = Object.values(balances);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Current Fertilizer Stock (kg)'
          }
        }
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return <canvas ref={canvasRef}></canvas>;
};
```

---

## 5. App Structure

```
farm-reports/
├── index.html          # Main app (React, styles, all components)
├── sw.js               # Service worker for offline support
├── manifest.json       # PWA manifest
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

### Navigation Tabs

```javascript
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'fertilizer', label: 'Fertilizer', icon: Package },
  { id: 'milk', label: 'Milk', icon: Droplets },
  { id: 'feed', label: 'Feed', icon: Wheat },
  { id: 'reports', label: 'Reports', icon: FileBarChart }
];
```

---

## 6. Key UI Components

### Dashboard
- Summary cards: Today's milk, This month's feed, Stock alerts
- Quick entry buttons for common actions
- Mini charts showing trends

### Fertilizer Module
- **List View**: Current stock levels per farm/type with color-coded alerts (low stock = red)
- **Add Entry**: Form for IN/OUT transactions
- **History**: Filterable transaction list

### Milk Production Module
- **Daily Entry**: Quick form for morning/afternoon milking
- **Calendar View**: Heat map showing production levels
- **Trends**: Line chart comparing months

### Feed Module
- **Daily Entry**: Record feed per cow group
- **Category Summary**: Roughage vs Meal vs Grass breakdown
- **Cost Analysis**: If you add price data later

### Reports Module
- **Financial Year Selector**: Dropdown for FY selection
- **Date Range Filter**: Custom date ranges
- **Export**: Generate report summaries
- **Comparison**: Year-over-year comparison charts

---

## 7. Color Scheme (Sleek Farm Theme)

```css
:root {
  --primary: #2563EB;        /* Blue - Main actions */
  --primary-dark: #1D4ED8;
  --success: #10B981;        /* Green - Positive/Growth */
  --warning: #F59E0B;        /* Amber - Alerts */
  --danger: #EF4444;         /* Red - Low stock/Issues */
  --neutral-50: #F9FAFB;     /* Light backgrounds */
  --neutral-100: #F3F4F6;
  --neutral-200: #E5E7EB;
  --neutral-700: #374151;    /* Text */
  --neutral-900: #111827;    /* Headings */
}
```

---

## 8. Sample Data Entry Forms

### Milk Production Form

```javascript
const MilkEntryForm = ({ onSubmit, farms, cowGroups, currentUser }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    farm: '',
    milking: 'Morning',
    cowGroup: '',
    cowCount: '',
    liters: '',
    notes: ''
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Date</label>
          <input type="date" value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})} />
        </div>
        <div>
          <label>Farm</label>
          <select value={formData.farm}
            onChange={e => setFormData({...formData, farm: e.target.value})}>
            <option value="">Select Farm</option>
            {farms.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Milking</label>
          <select value={formData.milking}
            onChange={e => setFormData({...formData, milking: e.target.value})}>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
          </select>
        </div>
        <div>
          <label>Cow Group</label>
          <select value={formData.cowGroup}
            onChange={e => setFormData({...formData, cowGroup: e.target.value})}>
            <option value="">Select Group</option>
            {cowGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Cow Count</label>
          <input type="number" value={formData.cowCount}
            onChange={e => setFormData({...formData, cowCount: e.target.value})}
            placeholder="Number of cows" />
        </div>
        <div>
          <label>Liters</label>
          <input type="number" value={formData.liters}
            onChange={e => setFormData({...formData, liters: e.target.value})}
            placeholder="Total liters" />
        </div>
      </div>

      <div>
        <label>Notes (Optional)</label>
        <textarea value={formData.notes}
          onChange={e => setFormData({...formData, notes: e.target.value})}
          rows="2" />
      </div>

      <button type="submit" className="btn-primary w-full">
        Save Milk Production
      </button>
    </form>
  );
};
```

---

## 9. Calculated Metrics

Add these useful calculations:

```javascript
// Liters per cow
const litersPerCow = (liters, cowCount) => cowCount > 0 ? (liters / cowCount).toFixed(1) : 0;

// Feed per cow per day
const feedPerCow = (feedQty, cowCount) => cowCount > 0 ? (feedQty / cowCount).toFixed(2) : 0;

// Month-over-month change
const monthChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

// Fertilizer stock alert
const stockAlert = (balance, minThreshold = 500) => {
  if (balance <= 0) return 'critical';
  if (balance < minThreshold) return 'low';
  return 'ok';
};
```

---

## 10. Deployment Steps

1. **Create Google Sheet** with all tabs as specified
2. **Add Google Apps Script** and deploy as web app
3. **Copy index.html from Oostagri PO** as starting point
4. **Replace API_URL** with your new script URL
5. **Update components** for farm reporting modules
6. **Update manifest.json** with new app name
7. **Update service worker** cache list
8. **Host on GitHub Pages** or similar
9. **Test on mobile devices**
10. **Add to home screen** as PWA

---

## Quick Start Checklist

- [ ] Create new Google Sheet
- [ ] Add all tabs with headers
- [ ] Add sample data for testing
- [ ] Create and deploy Apps Script
- [ ] Copy Oostagri PO files
- [ ] Update API URL
- [ ] Build Dashboard component
- [ ] Build Fertilizer module
- [ ] Build Milk Production module
- [ ] Build Feed module
- [ ] Build Reports with charts
- [ ] Test offline functionality
- [ ] Deploy and test on phone

---

## Future Enhancements

1. **Photo attachments** - Capture fertilizer delivery notes
2. **Push notifications** - Low stock alerts
3. **PDF export** - Monthly reports
4. **Multi-farm comparison** - Side-by-side analytics
5. **Weather integration** - Correlate with production
6. **Budget tracking** - Cost per liter analysis
