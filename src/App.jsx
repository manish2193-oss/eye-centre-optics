import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

const STORAGE_KEY = "eye-centre-optics-records";
const LAST_SEQUENCE_KEY = "eye-centre-optics-last-sequence";
const SHOP_NAME = "Eye Centre";
const SHOP_ADDRESS = "Shop No. 31, Sector 8, Panchkula — 134109, Haryana, India";
const SHOP_PHONE = "0172-2561168";
const SHOP_GSTIN = "06ABJPK3814GIZU";
const SHOP_STATE_CODE = "06";
const SHOP_EMAIL = "anilgupta.eyecentre@gmail.com";

const initialCustomer = {
  fullName: "",
  age: "",
  sex: "",
  phone: "",
  address: "",
  complaints: "",
};

function createEmptyEyePrescription() {
  return { sph: "", cyl: "", axis: "", va: "" };
}

function getLocalDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createInitialPrescription() {
  return {
    distance: {
      od: createEmptyEyePrescription(),
      os: createEmptyEyePrescription(),
    },
    nearAdd: {
      od: createEmptyEyePrescription(),
      os: createEmptyEyePrescription(),
    },
    pd: "",
    testedBy: "",
    remarks: "",
    nextReview: "",
    testRecordedOn: getLocalDate(),
  };
}

function createInitialOrder() {
  return {
    frame: "",
    lensType: "",
    total: "",
    advance: "",
    deliveryDate: "",
  };
}

function calculateBalance(total, advance) {
  const totalAmount = Number(total) || 0;
  const advanceAmount = Number(advance) || 0;
  return (totalAmount - advanceAmount).toFixed(2);
}

function amountInWords(value) {
  const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const number = Math.max(0, Number(value) || 0);
  const rupees = Math.floor(number);
  const paise = Math.round((number - rupees) * 100);

  function belowThousand(amount) {
    const words = [];
    let remainder = amount;

    if (remainder >= 100) {
      words.push(`${ones[Math.floor(remainder / 100)]} Hundred`);
      remainder %= 100;
    }
    if (remainder >= 20) {
      words.push(tens[Math.floor(remainder / 10)]);
      remainder %= 10;
    }
    if (remainder > 0) words.push(ones[remainder]);
    return words.join(" ");
  }

  function integerWords(amount) {
    if (amount === 0) return ones[0];

    const parts = [];
    const groups = [
      [10_000_000, "Crore"],
      [100_000, "Lakh"],
      [1_000, "Thousand"],
    ];
    let remainder = amount;

    groups.forEach(([size, label]) => {
      if (remainder >= size) {
        parts.push(`${belowThousand(Math.floor(remainder / size))} ${label}`);
        remainder %= size;
      }
    });
    if (remainder > 0) parts.push(belowThousand(remainder));
    return parts.join(" ");
  }

  const paiseWords = paise ? ` and ${integerWords(paise)} Paise` : "";
  return `${integerWords(rupees)} Rupees${paiseWords} Only`;
}

function loadLocalRecords() {
  try {
    const storedRecords = localStorage.getItem(STORAGE_KEY);
    const parsedRecords = storedRecords ? JSON.parse(storedRecords) : [];
    return Array.isArray(parsedRecords) ? parsedRecords : [];
  } catch {
    return [];
  }
}

function createRecordMetadata() {
  const startedAt = new Date().toISOString();

  return {
    id: null,
    recordNumber: "Assigned when saved",
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function mapDatabaseRecord(row) {
  return {
    id: row.id,
    recordNumber: row.record_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      fullName: row.full_name,
      age: row.age?.toString() ?? "",
      sex: row.sex ?? "",
      phone: row.phone ?? "",
      address: row.address,
      complaints: row.complaints ?? "",
    },
    prescription: row.prescription ?? createInitialPrescription(),
    order: row.order_details ?? createInitialOrder(),
  };
}

function createDatabasePayload(customer, prescription, order) {
  return {
    full_name: customer.fullName.trim(),
    age: customer.age === "" ? null : Number(customer.age),
    sex: customer.sex || null,
    phone: customer.phone || null,
    address: customer.address.trim(),
    complaints: customer.complaints || null,
    prescription,
    order_details: order,
  };
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatDate(date) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function formatPower(value) {
  if (value.trim() === "") {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(2)}`;
}

function displayValue(value) {
  return value || "—";
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function PrintablePrescription({ record }) {
  const prescription = record.prescription ?? createInitialPrescription();
  const order = record.order ?? createInitialOrder();
  const hasOrder = Object.values(order).some(Boolean);

  return (
    <article className="print-prescription">
      <header className="print-header">
        <div>
          <h1>{SHOP_NAME}</h1>
          <p>Spectacles · Contact Lenses · Goggles</p>
        </div>
        <div className="print-shop-details">
          <p><strong>GSTIN {SHOP_GSTIN} · State code {SHOP_STATE_CODE}</strong></p>
          <p>{SHOP_ADDRESS}</p>
          <p>Tel: {SHOP_PHONE}</p>
          <p>Open all days · 10:00 am to 9:00 pm</p>
          <p>{SHOP_EMAIL}</p>
        </div>
      </header>

      <section className="print-customer-grid">
        <div><span>Record number</span><strong>{record.recordNumber}</strong></div>
        <div><span>Customer</span><strong>{record.customer.fullName}</strong></div>
        <div><span>Age / Sex</span><strong>{displayValue([record.customer.age, record.customer.sex].filter(Boolean).join(" / "))}</strong></div>
        <div><span>Phone</span><strong>{displayValue(record.customer.phone)}</strong></div>
        <div className="print-wide"><span>Address</span><strong>{record.customer.address}</strong></div>
        <div className="print-wide"><span>Complaints</span><strong>{displayValue(record.customer.complaints)}</strong></div>
      </section>

      <h2>Optical Prescription</h2>
      <table className="print-table">
        <thead>
          <tr><th>Type</th><th>Eye</th><th>Sph</th><th>Cyl</th><th>Axis</th><th>VA</th></tr>
        </thead>
        <tbody>
          {[
            ["distance", "Distance"],
            ["nearAdd", "Near Add"],
          ].flatMap(([section, label]) => [
            ["od", "Right / OD"],
            ["os", "Left / OS"],
          ].map(([eye, eyeLabel], index) => (
            <tr key={`${section}-${eye}`}>
              {index === 0 && <th rowSpan="2">{label}</th>}
              <th>{eyeLabel}</th>
              <td>{displayValue(prescription[section][eye].sph)}</td>
              <td>{displayValue(prescription[section][eye].cyl)}</td>
              <td>{displayValue(prescription[section][eye].axis)}</td>
              <td>{displayValue(prescription[section][eye].va)}</td>
            </tr>
          ))) }
        </tbody>
      </table>

      <section className="print-test-details">
        <p><span>PD (mm)</span><strong>{displayValue(prescription.pd)}</strong></p>
        <p><span>Tested by</span><strong>{displayValue(prescription.testedBy)}</strong></p>
        <p><span>Test recorded on</span><strong>{displayValue(prescription.testRecordedOn)}</strong></p>
        <p><span>Next review</span><strong>{displayValue(prescription.nextReview)}</strong></p>
        <p className="print-wide"><span>Remarks / advice</span><strong>{displayValue(prescription.remarks)}</strong></p>
      </section>

      {hasOrder && (
        <section className="print-order">
          <h2>Order Information</h2>
          <div className="print-order-grid">
            <p><span>Frame</span><strong>{displayValue(order.frame)}</strong></p>
            <p><span>Lens type</span><strong>{displayValue(order.lensType)}</strong></p>
            <p><span>Total</span><strong>₹{Number(order.total || 0).toFixed(2)}</strong></p>
            <p><span>Advance</span><strong>₹{Number(order.advance || 0).toFixed(2)}</strong></p>
            <p><span>Balance</span><strong>₹{calculateBalance(order.total, order.advance)}</strong></p>
            <p><span>Delivery date</span><strong>{displayValue(order.deliveryDate)}</strong></p>
          </div>
        </section>
      )}

      <footer className="print-footer">
        <p>Review date: <strong>{displayValue(prescription.nextReview)}</strong></p>
        <div className="signature-line">Authorized signature</div>
      </footer>
    </article>
  );
}

function PrintableBill({ record }) {
  const order = record.order ?? createInitialOrder();
  const particulars = [
    order.frame && `Frame: ${order.frame}`,
    order.lensType && `Lens: ${order.lensType}`,
  ].filter(Boolean).join(" · ");

  return (
    <article className="print-bill">
      <div className="bill-tax-line">
        <strong>GSTIN: {SHOP_GSTIN}</strong>
        <strong>GST / TAX INVOICE</strong>
        <strong>State code: {SHOP_STATE_CODE}</strong>
      </div>

      <header className="bill-header">
        <h1>{SHOP_NAME}</h1>
        <p>Spectacles · Contact Lenses · Goggles</p>
        <p>{SHOP_ADDRESS}</p>
        <p>Tel: {SHOP_PHONE} · {SHOP_EMAIL}</p>
      </header>

      <section className="bill-meta-grid">
        <div><span>Bill number</span><strong>{record.recordNumber}</strong></div>
        <div><span>Invoice date</span><strong>{formatDate(record.createdAt.slice(0, 10))}</strong></div>
        <div><span>Delivery date</span><strong>{formatDate(order.deliveryDate)}</strong></div>
      </section>

      <section className="bill-customer-grid">
        <div><span>Customer name</span><strong>{record.customer.fullName}</strong></div>
        <div><span>Phone</span><strong>{displayValue(record.customer.phone)}</strong></div>
        <div className="bill-wide"><span>Address</span><strong>{record.customer.address}</strong></div>
      </section>

      <table className="bill-items">
        <thead>
          <tr><th>No.</th><th>Particulars</th><th>HSN code</th><th>Amount (₹)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{displayValue(particulars)}</td>
            <td>—</td>
            <td>{Number(order.total || 0).toFixed(2)}</td>
          </tr>
          <tr className="bill-empty-row"><td /><td /><td /><td /></tr>
        </tbody>
      </table>

      <section className="bill-summary">
        <div className="bill-words">
          <strong>Under Composite Scheme</strong>
          <span>Rupees in words</span>
          <p>{amountInWords(order.total)}</p>
        </div>
        <div className="bill-totals">
          <span>Total</span><strong>₹{Number(order.total || 0).toFixed(2)}</strong>
          <span>Advance</span><strong>₹{Number(order.advance || 0).toFixed(2)}</strong>
          <span>Balance</span><strong>₹{calculateBalance(order.total, order.advance)}</strong>
        </div>
      </section>

      <footer className="bill-footer">
        <div>
          <strong>Delivery after 5:00 pm.</strong>
          <strong>No claim will be entertained if delivery is not taken within one month.</strong>
        </div>
        <div className="signature-line">Authorized signature</div>
      </footer>
    </article>
  );
}

function LoginScreen({ authError, isSubmitting, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(event) {
    event.preventDefault();
    onSignIn(email.trim(), password);
  }

  return (
    <main className="login-shell">
      <div className="login-layout">
        <aside className="login-story" aria-label={SHOP_NAME}>
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <p className="shop-kicker">{SHOP_NAME} · Panchkula</p>
          <h1>Clear vision.<br />Thoughtful care.</h1>
          <p>A secure workspace for customer records, precise prescriptions and dependable follow-up.</p>
          <div className="login-trust-line">
            <span>Optical records</span>
            <span>Secure cloud</span>
            <span>Ready to print</span>
            <span>{SHOP_PHONE}</span>
          </div>
        </aside>

        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-card-brand">
            <div className="brand-mark brand-mark-small" aria-hidden="true"><span /></div>
            <div>
              <strong>{SHOP_NAME}</strong>
              <span>Shop records</span>
            </div>
          </div>
          <p className="eyebrow">Authorized access</p>
          <h2 id="login-heading">Welcome back</h2>
          <p>Sign in to manage customer records and optical prescriptions.</p>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="loginEmail">Email</label>
              <input
                id="loginEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {authError && <p className="login-error" role="alert">{authError}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
          <p className="login-footnote">Protected customer information · Authorized shop use only</p>
        </section>
      </div>
    </main>
  );
}

function App() {
  const [records, setRecords] = useState([]);
  const [localRecords, setLocalRecords] = useState(loadLocalRecords);
  const [activeTab, setActiveTab] = useState("new");
  const [metadata, setMetadata] = useState(createRecordMetadata);
  const [customer, setCustomer] = useState(initialCustomer);
  const [prescription, setPrescription] = useState(createInitialPrescription);
  const [order, setOrder] = useState(createInitialOrder);
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [printRecord, setPrintRecord] = useState(null);
  const [printType, setPrintType] = useState("prescription");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setRecords([]);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      return undefined;
    }

    let active = true;

    supabase
      .from("optical_records")
      .select("*")
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setStorageError(`Cloud records could not be loaded: ${error.message}`);
        } else {
          setRecords(data.map(mapDatabaseRecord));
        }
        setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRecords = records.filter((record) => (
    record.customer.fullName.toLowerCase().includes(normalizedSearch)
    || record.customer.phone.toLowerCase().includes(normalizedSearch)
    || record.recordNumber.toLowerCase().includes(normalizedSearch)
  ));

  function confirmDiscardChanges() {
    return !hasUnsavedChanges || window.confirm(
      "This record has unsaved changes. Discard them?",
    );
  }

  function resetForm() {
    setMetadata(createRecordMetadata());
    setCustomer(initialCustomer);
    setPrescription(createInitialPrescription());
    setOrder(createInitialOrder());
    setErrors({});
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(false);
    setIsEditing(false);
  }

  function handleTabChange(nextTab) {
    if (nextTab === activeTab) {
      return;
    }

    if (activeTab === "new" && !confirmDiscardChanges()) {
      return;
    }

    resetForm();
    setActiveTab(nextTab);
  }

  async function handleSignIn(email, password) {
    if (!supabase) return;

    setAuthSubmitting(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
    }
    setAuthSubmitting(false);
  }

  async function handleSignOut() {
    if (!supabase || !confirmDiscardChanges()) return;
    await supabase.auth.signOut();
    resetForm();
    setActiveTab("new");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "") : value;

    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [name]: nextValue,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }

    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!customer.fullName.trim()) {
      nextErrors.fullName = "Please enter the customer's full name.";
    }

    if (!customer.address.trim()) {
      nextErrors.address = "Please enter the customer's address.";
    }

    const formIsValid = Object.keys(nextErrors).length === 0;

    setErrors(nextErrors);

    if (formIsValid && supabase) {
      setDataLoading(true);
      setStorageError("");
      const payload = createDatabasePayload(customer, prescription, order);
      const query = metadata.id
        ? supabase.from("optical_records").update(payload).eq("id", metadata.id)
        : supabase.from("optical_records").insert(payload);
      const { data, error } = await query.select().single();

      if (error) {
        setStorageError(`The record could not be saved: ${error.message}`);
        setSaveMessage("");
      } else {
        const savedRecord = mapDatabaseRecord(data);
        setRecords((currentRecords) => {
          const exists = currentRecords.some((record) => record.id === savedRecord.id);
          return exists
            ? currentRecords.map((record) => (
                record.id === savedRecord.id ? savedRecord : record
              ))
            : [...currentRecords, savedRecord];
        });
        setMetadata({
          id: savedRecord.id,
          recordNumber: savedRecord.recordNumber,
          createdAt: savedRecord.createdAt,
          updatedAt: savedRecord.updatedAt,
        });
        setCustomer(savedRecord.customer);
        setSaveMessage(`${savedRecord.recordNumber} saved securely to the cloud.`);
        setHasUnsavedChanges(false);
        setIsEditing(true);
      }
      setDataLoading(false);
    }
  }

  function handlePrescriptionChange(event) {
    const { name, value } = event.target;

    setPrescription((currentPrescription) => ({
      ...currentPrescription,
      [name]: value,
    }));
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(true);
  }

  function handleOrderChange(event) {
    const { name, value } = event.target;

    setOrder((currentOrder) => ({
      ...currentOrder,
      [name]: value,
    }));
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(true);
  }

  function handleEyePrescriptionChange(section, eye, field, value) {
    setPrescription((currentPrescription) => ({
      ...currentPrescription,
      [section]: {
        ...currentPrescription[section],
        [eye]: {
          ...currentPrescription[section][eye],
          [field]: value,
        },
      },
    }));
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(true);
  }

  function handlePowerBlur(section, eye, field) {
    setPrescription((currentPrescription) => ({
      ...currentPrescription,
      [section]: {
        ...currentPrescription[section],
        [eye]: {
          ...currentPrescription[section][eye],
          [field]: formatPower(currentPrescription[section][eye][field]),
        },
      },
    }));
  }

  function handlePowerStep(section, eye, field, change) {
    setPrescription((currentPrescription) => {
      const currentValue = Number(currentPrescription[section][eye][field]);
      const startingValue = Number.isFinite(currentValue) ? currentValue : 0;
      const nextValue = startingValue + change;

      return {
        ...currentPrescription,
        [section]: {
          ...currentPrescription[section],
          [eye]: {
            ...currentPrescription[section][eye],
            [field]: formatPower(nextValue.toString()),
          },
        },
      };
    });
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(true);
  }

  function handleStartNewRecord() {
    if (!confirmDiscardChanges()) {
      return;
    }

    resetForm();
    setActiveTab("new");
  }

  function handleOpenRecord(record) {
    setMetadata({
      id: record.id,
      recordNumber: record.recordNumber,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    setCustomer(record.customer);
    setPrescription(record.prescription ?? createInitialPrescription());
    setOrder(record.order ?? createInitialOrder());
    setErrors({});
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(false);
    setIsEditing(true);
    setActiveTab("new");
  }

  function handleCancelEdit() {
    if (!confirmDiscardChanges()) {
      return;
    }

    resetForm();
    setActiveTab("records");
  }

  async function handleDeleteRecord(record) {
    const shouldDelete = window.confirm(
      `Delete ${record.recordNumber} for ${record.customer.fullName}? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDataLoading(true);
    const { error } = await supabase.from("optical_records").delete().eq("id", record.id);

    if (error) {
      window.alert(`The record could not be deleted: ${error.message}`);
    } else {
      setRecords((currentRecords) => currentRecords.filter(
        (currentRecord) => currentRecord.id !== record.id,
      ));
    }
    setDataLoading(false);
  }

  async function handleImportLocalRecords() {
    if (!localRecords.length || !supabase) return;

    const shouldImport = window.confirm(
      `Import ${localRecords.length} local ${localRecords.length === 1 ? "record" : "records"} into the secure cloud database? New ECO numbers will be assigned.`,
    );

    if (!shouldImport) return;

    setDataLoading(true);
    setStorageError("");
    const payloads = localRecords.map((record) => ({
      ...createDatabasePayload(
        record.customer,
        record.prescription ?? createInitialPrescription(),
        record.order ?? createInitialOrder(),
      ),
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    }));
    const { data, error } = await supabase
      .from("optical_records")
      .insert(payloads)
      .select();

    if (error) {
      setStorageError(`Local records could not be imported: ${error.message}`);
    } else {
      const importedRecords = data.map(mapDatabaseRecord);
      setRecords((currentRecords) => [...currentRecords, ...importedRecords]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SEQUENCE_KEY);
      setLocalRecords([]);
      setSaveMessage(`${importedRecords.length} local ${importedRecords.length === 1 ? "record" : "records"} imported securely.`);
    }
    setDataLoading(false);
  }

  function handlePrintRecord(record) {
    setPrintType("prescription");
    setPrintRecord(record);
    window.setTimeout(() => window.print(), 0);
  }

  function handlePrintBill(record) {
    setPrintType("bill");
    setPrintRecord(record);
    window.setTimeout(() => window.print(), 0);
  }

  function handleExportCsv() {
    const headers = [
      "Record Number", "Created At", "Updated At", "Full Name", "Age", "Sex", "Phone",
      "Address", "Complaints", "Distance OD Sph", "Distance OD Cyl", "Distance OD Axis",
      "Distance OD VA", "Distance OS Sph", "Distance OS Cyl", "Distance OS Axis", "Distance OS VA",
      "Near OD Sph", "Near OD Cyl", "Near OD Axis", "Near OD VA", "Near OS Sph", "Near OS Cyl",
      "Near OS Axis", "Near OS VA", "PD (mm)", "Tested By", "Remarks / Advice", "Next Review",
      "Test Recorded On", "Frame", "Lens Type", "Total", "Advance", "Balance", "Delivery Date",
    ];
    const rows = records.map((record) => {
      const prescription = record.prescription ?? createInitialPrescription();
      const order = record.order ?? createInitialOrder();
      return [
        record.recordNumber, record.createdAt, record.updatedAt, record.customer.fullName,
        record.customer.age, record.customer.sex, record.customer.phone, record.customer.address,
        record.customer.complaints, prescription.distance.od.sph, prescription.distance.od.cyl,
        prescription.distance.od.axis, prescription.distance.od.va, prescription.distance.os.sph,
        prescription.distance.os.cyl, prescription.distance.os.axis, prescription.distance.os.va,
        prescription.nearAdd.od.sph, prescription.nearAdd.od.cyl, prescription.nearAdd.od.axis,
        prescription.nearAdd.od.va, prescription.nearAdd.os.sph, prescription.nearAdd.os.cyl,
        prescription.nearAdd.os.axis, prescription.nearAdd.os.va, prescription.pd,
        prescription.testedBy, prescription.remarks, prescription.nextReview,
        prescription.testRecordedOn, order.frame, order.lensType, order.total, order.advance,
        calculateBalance(order.total, order.advance), order.deliveryDate,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map(csvValue).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `eye-centre-backup-${getLocalDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>Supabase configuration required</h1>
          <p>Add the project URL and publishable key to the Vite environment before starting the app.</p>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return <main className="loading-screen">Checking secure session…</main>;
  }

  if (!session) {
    return (
      <LoginScreen
        authError={authError}
        isSubmitting={authSubmitting}
        onSignIn={handleSignIn}
      />
    );
  }

  return (
    <>
    <div className="app-shell">
      <header className="shop-header">
        <div className="shop-identity">
          <div className="brand-mark brand-mark-header" aria-hidden="true"><span /></div>
          <div>
            <p className="shop-kicker">Spectacles · Contact Lenses · Goggles</p>
            <h1>{SHOP_NAME}</h1>
            <p>{SHOP_ADDRESS}</p>
            <p className="shop-contact-details">
              Tel: {SHOP_PHONE} · GSTIN: {SHOP_GSTIN} · State code: {SHOP_STATE_CODE}
            </p>
          </div>
        </div>
        <div className="account-controls">
          <p>{session.user.email}</p>
          <button className="secondary-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Main sections">
        <button
          className={activeTab === "new" ? "tab active" : "tab"}
          type="button"
          aria-pressed={activeTab === "new"}
          onClick={() => handleTabChange("new")}
        >
          New Record
        </button>
        <button
          className={activeTab === "records" ? "tab active" : "tab"}
          type="button"
          aria-pressed={activeTab === "records"}
          onClick={() => handleTabChange("records")}
        >
          Records
        </button>
      </nav>

      <main className="content-card">
        {localRecords.length > 0 && (
          <aside className="migration-banner">
            <div>
              <strong>{localRecords.length} local {localRecords.length === 1 ? "record is" : "records are"} available</strong>
              <p>Import them once into the secure cloud database. New ECO numbers will be assigned.</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={handleImportLocalRecords}
              disabled={dataLoading}
            >
              Import local records
            </button>
          </aside>
        )}
        {activeTab === "new" && (
          <section aria-labelledby="customer-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{isEditing ? "Edit Record" : "New Record"}</p>
                <h2 id="customer-heading">Customer details</h2>
              </div>
              <p><span aria-hidden="true">*</span> Required fields</p>
            </div>

            <dl className="record-metadata" aria-label="Record information">
              <div>
                <dt>Record number</dt>
                <dd>{metadata.recordNumber}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(metadata.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateTime(metadata.updatedAt)}</dd>
              </div>
            </dl>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <div className="field field-wide">
                  <label htmlFor="fullName">Full name <span>*</span></label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={customer.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  />
                  {errors.fullName && (
                    <p className="field-error" id="fullName-error">{errors.fullName}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="age">Age</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    value={customer.age}
                    onChange={handleChange}
                    inputMode="numeric"
                  />
                </div>

                <div className="field">
                  <label htmlFor="sex">Sex</label>
                  <select id="sex" name="sex" value={customer.sex} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="field field-wide">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={customer.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <div className="field field-full">
                  <label htmlFor="address">Address <span>*</span></label>
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    value={customer.address}
                    onChange={handleChange}
                    autoComplete="street-address"
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? "address-error" : undefined}
                  />
                  {errors.address && (
                    <p className="field-error" id="address-error">{errors.address}</p>
                  )}
                </div>

                <div className="field field-full">
                  <label htmlFor="complaints">Complaints</label>
                  <textarea
                    id="complaints"
                    name="complaints"
                    rows="4"
                    value={customer.complaints}
                    onChange={handleChange}
                    placeholder="Customer's symptoms or reason for visit"
                  />
                </div>
              </div>

              <section className="prescription-section" aria-labelledby="prescription-heading">
                <div className="subsection-heading">
                  <div>
                    <p className="eyebrow">Eye Test</p>
                    <h2 id="prescription-heading">Optical prescription</h2>
                  </div>
                  <p>Power is formatted when you leave the field.</p>
                </div>

                <div className="prescription-table-wrap">
                  <table className="prescription-table">
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col">Eye</th>
                        <th scope="col">Sph</th>
                        <th scope="col">Cyl</th>
                        <th scope="col">Axis</th>
                        <th scope="col">VA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["distance", "Distance"],
                        ["nearAdd", "Near Add"],
                      ].flatMap(([section, sectionLabel]) => (
                        [
                          ["od", "Right / OD"],
                          ["os", "Left / OS"],
                        ].map(([eye, eyeLabel], eyeIndex) => (
                          <tr key={`${section}-${eye}`}>
                            {eyeIndex === 0 && <th scope="rowgroup" rowSpan="2">{sectionLabel}</th>}
                            <th scope="row">{eyeLabel}</th>
                            {(["sph", "cyl"]).map((field) => (
                              <td key={field}>
                                <div className="power-control">
                                  <button
                                    type="button"
                                    aria-label={`Subtract 0.25 from ${sectionLabel} ${eyeLabel} ${field}`}
                                    onClick={() => handlePowerStep(section, eye, field, -0.25)}
                                  >
                                    −
                                  </button>
                                  <input
                                    id={`${section}-${eye}-${field}`}
                                    aria-label={`${sectionLabel} ${eyeLabel} ${field}`}
                                    type="text"
                                    inputMode="decimal"
                                    value={prescription[section][eye][field]}
                                    onChange={(event) => handleEyePrescriptionChange(
                                      section,
                                      eye,
                                      field,
                                      event.target.value,
                                    )}
                                    onBlur={() => handlePowerBlur(section, eye, field)}
                                    placeholder="+0.00"
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Add 0.25 to ${sectionLabel} ${eyeLabel} ${field}`}
                                    onClick={() => handlePowerStep(section, eye, field, 0.25)}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                            ))}
                            <td>
                              <input
                                id={`${section}-${eye}-axis`}
                                aria-label={`${sectionLabel} ${eyeLabel} axis`}
                                type="number"
                                min="0"
                                max="180"
                                inputMode="numeric"
                                value={prescription[section][eye].axis}
                                onChange={(event) => handleEyePrescriptionChange(
                                  section,
                                  eye,
                                  "axis",
                                  event.target.value,
                                )}
                              />
                            </td>
                            <td>
                              <input
                                id={`${section}-${eye}-va`}
                                aria-label={`${sectionLabel} ${eyeLabel} visual acuity`}
                                type="text"
                                value={prescription[section][eye].va}
                                onChange={(event) => handleEyePrescriptionChange(
                                  section,
                                  eye,
                                  "va",
                                  event.target.value,
                                )}
                              />
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-grid prescription-details">
                  <div className="field">
                    <label htmlFor="pd">PD (mm)</label>
                    <input
                      id="pd"
                      name="pd"
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={prescription.pd}
                      onChange={handlePrescriptionChange}
                    />
                  </div>

                  <div className="field field-wide">
                    <label htmlFor="testedBy">Tested by</label>
                    <input
                      id="testedBy"
                      name="testedBy"
                      type="text"
                      value={prescription.testedBy}
                      onChange={handlePrescriptionChange}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="testRecordedOn">Test recorded on</label>
                    <input
                      id="testRecordedOn"
                      name="testRecordedOn"
                      type="date"
                      value={prescription.testRecordedOn}
                      onChange={handlePrescriptionChange}
                    />
                  </div>

                  <div className="field field-wide">
                    <label htmlFor="nextReview">Next review</label>
                    <input
                      id="nextReview"
                      name="nextReview"
                      type="date"
                      value={prescription.nextReview}
                      onChange={handlePrescriptionChange}
                    />
                  </div>

                  <div className="field field-full">
                    <label htmlFor="remarks">Remarks / advice</label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      rows="3"
                      value={prescription.remarks}
                      onChange={handlePrescriptionChange}
                    />
                  </div>
                </div>
              </section>

              <section className="order-section" aria-labelledby="order-heading">
                <div className="subsection-heading">
                  <div>
                    <p className="eyebrow">Optional</p>
                    <h2 id="order-heading">Order information</h2>
                  </div>
                  <p>Complete only when an order is placed.</p>
                </div>

                <div className="form-grid">
                  <div className="field field-wide">
                    <label htmlFor="frame">Frame</label>
                    <input
                      id="frame"
                      name="frame"
                      type="text"
                      value={order.frame}
                      onChange={handleOrderChange}
                    />
                  </div>

                  <div className="field field-wide">
                    <label htmlFor="lensType">Lens type</label>
                    <input
                      id="lensType"
                      name="lensType"
                      type="text"
                      value={order.lensType}
                      onChange={handleOrderChange}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="total">Total ₹</label>
                    <input
                      id="total"
                      name="total"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={order.total}
                      onChange={handleOrderChange}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="advance">Advance ₹</label>
                    <input
                      id="advance"
                      name="advance"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={order.advance}
                      onChange={handleOrderChange}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="balance">Balance ₹</label>
                    <input
                      id="balance"
                      type="text"
                      value={calculateBalance(order.total, order.advance)}
                      readOnly
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="deliveryDate">Delivery date</label>
                    <input
                      id="deliveryDate"
                      name="deliveryDate"
                      type="date"
                      value={order.deliveryDate}
                      onChange={handleOrderChange}
                    />
                  </div>
                </div>
              </section>

              <div className="form-actions">
                <div className="form-status" aria-live="polite">
                  {saveMessage && (
                    <p className="success-message" role="status">
                      {saveMessage}
                    </p>
                  )}
                  {storageError && <p className="storage-error">{storageError}</p>}
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleStartNewRecord}
                >
                  Start New Record
                </button>
                {isEditing && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={handleCancelEdit}
                  >
                    Cancel Edit
                  </button>
                )}
                <button className="primary-button" type="submit" disabled={dataLoading}>
                  {dataLoading ? "Saving…" : "Save Record"}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "records" && (
          <section aria-labelledby="records-heading">
            <div className="section-heading records-heading">
              <div>
                <p className="eyebrow">Records</p>
                <h2 id="records-heading">Saved customer records</h2>
              </div>
              <div className="records-heading-actions">
                <p>
                  {normalizedSearch
                    ? `${filteredRecords.length} of ${records.length} records`
                    : `${records.length} ${records.length === 1 ? "record" : "records"}`}
                </p>
                <button
                  className="export-button"
                  type="button"
                  onClick={handleExportCsv}
                  disabled={records.length === 0}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {dataLoading && records.length === 0 ? (
              <div className="empty-state"><p>Loading secure records…</p></div>
            ) : records.length === 0 ? (
              <div className="empty-state">
                <p>No records yet — saved customer records will appear here.</p>
              </div>
            ) : (
              <>
                <div className="records-search field">
                  <label htmlFor="recordSearch">Search records</label>
                  <input
                    id="recordSearch"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Name, phone, or record number"
                  />
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="empty-state search-empty">
                    <p>No records match “{searchQuery.trim()}”.</p>
                  </div>
                ) : (
                  <div className="records-list">
                    {filteredRecords
                  .slice()
                  .reverse()
                  .map((record) => (
                    <article className="record-card" key={record.recordNumber}>
                      <div>
                        <p className="record-number">{record.recordNumber}</p>
                        <h3>{record.customer.fullName}</h3>
                        <p>{record.customer.phone || "No phone number"}</p>
                      </div>
                      <div className="record-card-details">
                        <p>{record.customer.address}</p>
                        <p>Created {formatDateTime(record.createdAt)}</p>
                        <div className="record-actions">
                          <button
                            className="open-record-button"
                            type="button"
                            onClick={() => handleOpenRecord(record)}
                          >
                            Open
                          </button>
                          <button
                            className="print-record-button"
                            type="button"
                            onClick={() => handlePrintRecord(record)}
                          >
                            Prescription
                          </button>
                          <button
                            className="print-record-button"
                            type="button"
                            onClick={() => handlePrintBill(record)}
                          >
                            Bill
                          </button>
                          <button
                            className="delete-record-button"
                            type="button"
                            onClick={() => handleDeleteRecord(record)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
    {printRecord && printType === "prescription" && <PrintablePrescription record={printRecord} />}
    {printRecord && printType === "bill" && <PrintableBill record={printRecord} />}
    </>
  );
}

export default App;
