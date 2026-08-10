import { useState } from "react";

const STORAGE_KEY = "eye-centre-optics-records";

const initialCustomer = {
  fullName: "",
  age: "",
  sex: "",
  phone: "",
  address: "",
  complaints: "",
};

function formatRecordNumber(sequence) {
  return `ECO-${String(sequence).padStart(4, "0")}`;
}

function loadRecords() {
  try {
    const storedRecords = localStorage.getItem(STORAGE_KEY);
    const parsedRecords = storedRecords ? JSON.parse(storedRecords) : [];
    return Array.isArray(parsedRecords) ? parsedRecords : [];
  } catch {
    return [];
  }
}

function getNextSequence(records) {
  const highestSequence = records.reduce((highest, record) => {
    const sequence = Number(record.recordNumber?.replace("ECO-", ""));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return highestSequence + 1;
}

function createRecordMetadata(sequence) {
  const startedAt = new Date().toISOString();

  return {
    recordNumber: formatRecordNumber(sequence),
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function App() {
  const [records, setRecords] = useState(loadRecords);
  const [activeTab, setActiveTab] = useState("new");
  const [recordSequence, setRecordSequence] = useState(() => getNextSequence(records));
  const [metadata, setMetadata] = useState(() => createRecordMetadata(getNextSequence(records)));
  const [customer, setCustomer] = useState(initialCustomer);
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  function handleSubmit(event) {
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

    if (formIsValid) {
      const savedMetadata = {
        ...metadata,
        updatedAt: new Date().toISOString(),
      };
      const savedRecord = {
        ...savedMetadata,
        customer: {
          ...customer,
          fullName: customer.fullName.trim(),
          address: customer.address.trim(),
        },
      };
      const existingRecordIndex = records.findIndex(
        (record) => record.recordNumber === savedRecord.recordNumber,
      );
      const nextRecords = [...records];

      if (existingRecordIndex >= 0) {
        nextRecords[existingRecordIndex] = savedRecord;
      } else {
        nextRecords.push(savedRecord);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
        setRecords(nextRecords);
        setMetadata(savedMetadata);
        setCustomer(savedRecord.customer);
        setSaveMessage(`${savedRecord.recordNumber} saved successfully.`);
        setStorageError("");
        setHasUnsavedChanges(false);
      } catch {
        setStorageError("The record could not be saved in this browser. Please try again.");
        setSaveMessage("");
      }
    }
  }

  function handleStartNewRecord() {
    if (hasUnsavedChanges) {
      const shouldDiscard = window.confirm(
        "This record has unsaved changes. Start a new record and discard them?",
      );

      if (!shouldDiscard) {
        return;
      }
    }

    const nextSequence = Math.max(recordSequence + 1, getNextSequence(records));

    setRecordSequence(nextSequence);
    setMetadata(createRecordMetadata(nextSequence));
    setCustomer(initialCustomer);
    setErrors({});
    setSaveMessage("");
    setStorageError("");
    setHasUnsavedChanges(false);
    setActiveTab("new");
  }

  return (
    <div className="app-shell">
      <header className="shop-header">
        <p className="shop-kicker">Spectacles · Contact Lenses · Goggles</p>
        <h1>Eye Centre Optics</h1>
        <p>Shop No. 31, Sector 8, Panchkula — 134109, Haryana, India</p>
      </header>

      <nav className="tabs" aria-label="Main sections">
        <button
          className={activeTab === "new" ? "tab active" : "tab"}
          type="button"
          aria-pressed={activeTab === "new"}
          onClick={() => setActiveTab("new")}
        >
          New Record
        </button>
        <button
          className={activeTab === "records" ? "tab active" : "tab"}
          type="button"
          aria-pressed={activeTab === "records"}
          onClick={() => setActiveTab("records")}
        >
          Records
        </button>
      </nav>

      <main className="content-card">
        {activeTab === "new" && (
          <section aria-labelledby="customer-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">New Record</p>
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
                <button className="primary-button" type="submit">Save Record</button>
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
              <p>{records.length} {records.length === 1 ? "record" : "records"}</p>
            </div>

            {records.length === 0 ? (
              <div className="empty-state">
                <p>No records yet — saved customer records will appear here.</p>
              </div>
            ) : (
              <div className="records-list">
                {records
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
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
