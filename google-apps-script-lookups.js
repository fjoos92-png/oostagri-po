// ============================================================
// OOSTAGRI PO - COMPLETE GOOGLE APPS SCRIPT
// ============================================================
// Copy this entire script into your Google Apps Script editor
// (Extensions → Apps Script → Clear existing code → Paste this)
// ============================================================

// Main entry point - handles all API requests
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch(action) {
      case 'getOrders':
        return ContentService.createTextOutput(JSON.stringify(getOrders()))
          .setMimeType(ContentService.MimeType.JSON);

      case 'addOrder':
        const orderData = JSON.parse(e.parameter.order);
        return ContentService.createTextOutput(JSON.stringify(addOrder(orderData)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'updateOrder':
        const updateData = JSON.parse(e.parameter.order);
        return ContentService.createTextOutput(JSON.stringify(updateOrder(updateData)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'sendCode':
        const email = e.parameter.email;
        const name = e.parameter.name;
        const code = e.parameter.code;
        return ContentService.createTextOutput(JSON.stringify(sendLoginCode(email, name, code)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getLookups':
        return ContentService.createTextOutput(JSON.stringify(getLookups()))
          .setMimeType(ContentService.MimeType.JSON);

      default:
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// GET ALL ORDERS
// ============================================================
function getOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Purchase Orders');

    if (!sheet) {
      return { success: false, error: 'Purchase Orders sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orders = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Has PO number
        orders.push({
          poNumber: row[0],
          date: row[1],
          submittedBy: row[2],
          userInitials: row[3],
          farmLocation: row[4],
          department: row[5],
          supplier: row[6],
          category: row[7],
          item: row[8],
          description: row[9],
          quantity: row[10],
          paymentTerms: row[11],
          editedAt: row[12] || null,
          editedBy: row[13] || null
        });
      }
    }

    return { success: true, orders: orders };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// ADD NEW ORDER
// ============================================================
function addOrder(orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Purchase Orders');

    if (!sheet) {
      return { success: false, error: 'Purchase Orders sheet not found' };
    }

    sheet.appendRow([
      orderData.poNumber,
      orderData.date,
      orderData.submittedBy,
      orderData.userInitials,
      orderData.farmLocation,
      orderData.department,
      orderData.supplier,
      orderData.category,
      orderData.item,
      orderData.description,
      orderData.quantity,
      orderData.paymentTerms,
      '', // editedAt
      ''  // editedBy
    ]);

    return { success: true, poNumber: orderData.poNumber };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// UPDATE EXISTING ORDER
// ============================================================
function updateOrder(orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Purchase Orders');

    if (!sheet) {
      return { success: false, error: 'Purchase Orders sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderData.poNumber) {
        const row = i + 1;
        sheet.getRange(row, 1, 1, 14).setValues([[
          orderData.poNumber,
          orderData.date,
          orderData.submittedBy,
          orderData.userInitials,
          orderData.farmLocation,
          orderData.department,
          orderData.supplier,
          orderData.category,
          orderData.item,
          orderData.description,
          orderData.quantity,
          orderData.paymentTerms,
          orderData.editedAt,
          orderData.editedBy
        ]]);
        return { success: true, poNumber: orderData.poNumber };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// SEND LOGIN CODE VIA EMAIL
// ============================================================
function sendLoginCode(email, name, code) {
  try {
    const subject = 'Your Oostagri PO Login Code';
    const body = `Hi ${name},\n\nYour login code for the Oostagri PO app is: ${code}\n\nKeep this code safe and don't share it with anyone.\n\nRegards,\nOostagri PO System`;

    MailApp.sendEmail(email, subject, body);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// GET LOOKUP DATA (Users, Suppliers, Vehicles, Equipment, etc.)
// ============================================================
function getLookups() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Helper function to check if active
    const isActive = (value) => {
      return value === 'Yes' || value === 'yes' || value === true || value === 'TRUE' || value === 'true';
    };

    // Get Users (Column A = Name, B = Code, C = Initials, D = Role, E = Email, F = Active)
    const usersSheet = ss.getSheetByName('Users');
    const users = [];
    if (usersSheet) {
      const usersData = usersSheet.getDataRange().getValues();
      for (let i = 1; i < usersData.length; i++) {
        const name = usersData[i][0];
        const code = usersData[i][1];
        const initials = usersData[i][2];
        const role = usersData[i][3];
        const email = usersData[i][4];
        const active = usersData[i][5];
        if (name && code && isActive(active)) {
          users.push({
            name: name.toString().trim(),
            code: code.toString().trim(),
            initials: initials ? initials.toString().trim() : '',
            role: role ? role.toString().trim().toLowerCase() : 'user',
            email: email ? email.toString().trim() : ''
          });
        }
      }
    }

    // Get Suppliers (Column A = Name, Column B = Active)
    const suppliersSheet = ss.getSheetByName('Suppliers');
    const suppliers = [];
    if (suppliersSheet) {
      const suppliersData = suppliersSheet.getDataRange().getValues();
      for (let i = 1; i < suppliersData.length; i++) {
        const name = suppliersData[i][0];
        const active = suppliersData[i][1];
        if (name && isActive(active)) {
          suppliers.push(name.toString().trim());
        }
      }
    }

    // Get Vehicles (Column A = ID, Column B = Name, Column C = Active)
    const vehiclesSheet = ss.getSheetByName('Vehicles');
    const vehicles = [];
    if (vehiclesSheet) {
      const vehiclesData = vehiclesSheet.getDataRange().getValues();
      for (let i = 1; i < vehiclesData.length; i++) {
        const id = vehiclesData[i][0];
        const name = vehiclesData[i][1];
        const active = vehiclesData[i][2];
        if (name && isActive(active)) {
          vehicles.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Equipment (Column A = ID, Column B = Name, Column C = Active)
    const equipmentSheet = ss.getSheetByName('Equipment');
    const equipment = [];
    if (equipmentSheet) {
      const equipmentData = equipmentSheet.getDataRange().getValues();
      for (let i = 1; i < equipmentData.length; i++) {
        const id = equipmentData[i][0];
        const name = equipmentData[i][1];
        const active = equipmentData[i][2];
        if (name && isActive(active)) {
          equipment.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Tractors (Column A = ID, Column B = Name, Column C = Active)
    const tractorsSheet = ss.getSheetByName('Tractors');
    const tractors = [];
    if (tractorsSheet) {
      const tractorsData = tractorsSheet.getDataRange().getValues();
      for (let i = 1; i < tractorsData.length; i++) {
        const id = tractorsData[i][0];
        const name = tractorsData[i][1];
        const active = tractorsData[i][2];
        if (name && isActive(active)) {
          tractors.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Farms (Column A = Name, Column B = Active)
    const farmsSheet = ss.getSheetByName('Farms');
    const farms = [];
    if (farmsSheet) {
      const farmsData = farmsSheet.getDataRange().getValues();
      for (let i = 1; i < farmsData.length; i++) {
        const name = farmsData[i][0];
        const active = farmsData[i][1];
        if (name && isActive(active)) {
          farms.push(name.toString().trim());
        }
      }
    }

    // Get Departments (Column A = Name, Column B = Active)
    const departmentsSheet = ss.getSheetByName('Departments');
    const departments = [];
    if (departmentsSheet) {
      const departmentsData = departmentsSheet.getDataRange().getValues();
      for (let i = 1; i < departmentsData.length; i++) {
        const name = departmentsData[i][0];
        const active = departmentsData[i][1];
        if (name && isActive(active)) {
          departments.push(name.toString().trim());
        }
      }
    }

    return {
      success: true,
      lookups: {
        users: users.length > 0 ? users.sort((a, b) => a.name.localeCompare(b.name)) : null,
        suppliers: suppliers.sort((a, b) => a.localeCompare(b)),
        vehicles: vehicles.sort((a, b) => a.name.localeCompare(b.name)),
        equipment: equipment.sort((a, b) => a.name.localeCompare(b.name)),
        tractors: tractors.sort((a, b) => a.name.localeCompare(b.name)),
        farms: farms.length > 0 ? farms.sort((a, b) => a.localeCompare(b)) : null,
        departments: departments.length > 0 ? departments.sort((a, b) => a.localeCompare(b)) : null
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
