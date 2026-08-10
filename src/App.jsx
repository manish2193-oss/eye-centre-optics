import { useState } from "react";

const STORAGE_KEY = "eye-centre-optics-records";
const LAST_SEQUENCE_KEY = "eye-centre-optics-last-sequence";

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

  let storedSequence;

  try {
    storedSequence = Number(localStorage.getItem(LAST_SEQUENCE_KEY)) || 0;
  } catch {
    storedSequence = 0;
  }

  return Math.max(highestSequence, storedSequence) + 1;
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
          <h1>Eye Centre Optics</h1>
          <p>Spectacles · Contact Lenses · Goggles</p>
        </div>
        <div className="print-shop-details">
          <p>Shop No. 31, Sector 8, Panchkula — 134109, Haryana, India</p>
          <p>Open all days · 10:00 am to 9:00 pm</p>
          <p>anilgupta.eyecentre@gmail.com</p>
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

function App() {
  const [records, setRecords] = useState(loadRecords);
  const [activeTab, setActiveTab] = useState("new");
  const [metadata, setMetadata] = useState(() => createRecordMetadata(getNextSequence(records)));
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

  function resetForm(sequence) {
    setMetadata(createRecordMetadata(sequence));
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

    resetForm(getNextSequence(records));
    setActiveTab(nextTab);
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
        prescription,
        order,
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
        const savedSequence = Number(savedRecord.recordNumber.replace("ECO-", ""));
        const previousSequence = Number(localStorage.getItem(LAST_SEQUENCE_KEY)) || 0;
        localStorage.setItem(
          LAST_SEQUENCE_KEY,
          String(Math.max(previousSequence, Number.isFinite(savedSequence) ? savedSequence : 0)),
        );
        setRecords(nextRecords);
        setMetadata(savedMetadata);
        setCustomer(savedRecord.customer);
        setSaveMessage(`${savedRecord.recordNumber} saved successfully.`);
        setStorageError("");
        setHasUnsavedChanges(false);
        setIsEditing(true);
      } catch {
        setStorageError("The record could not be saved in this browser. Please try again.");
        setSaveMessage("");
      }
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

    const nextSequence = getNextSequence(records);

    resetForm(nextSequence);
    setActiveTab("new");
  }

  function handleOpenRecord(record) {
    setMetadata({
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

    resetForm(getNextSequence(records));
    setActiveTab("records");
  }

  function handleDeleteRecord(record) {
    const shouldDelete = window.confirm(
      `Delete ${record.recordNumber} for ${record.customer.fullName}? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    const nextRecords = records.filter(
      (currentRecord) => currentRecord.recordNumber !== record.recordNumber,
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
    } catch {
      window.alert("The record could not be deleted. Please try again.");
    }
  }

  function handlePrintRecord(record) {
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
    link.download = `eye-centre-optics-backup-${getLocalDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  return (
    <>
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

            {records.length === 0 ? (
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
                            Print
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
    {printRecord && <PrintablePrescription record={printRecord} />}
    </>
  );
}

export default App;
