import { useState } from "react";

const initialCustomer = {
  fullName: "",
  age: "",
  sex: "",
  phone: "",
  address: "",
  complaints: "",
};

function App() {
  const [activeTab, setActiveTab] = useState("new");
  const [customer, setCustomer] = useState(initialCustomer);
  const [errors, setErrors] = useState({});
  const [isReady, setIsReady] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }

    setIsReady(false);
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

    setErrors(nextErrors);
    setIsReady(Object.keys(nextErrors).length === 0);
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
                    inputMode="tel"
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
                {isReady && (
                  <p className="success-message" role="status">
                    Customer details are complete. Prescription entry will be added next.
                  </p>
                )}
                <button className="primary-button" type="submit">Continue</button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "records" && (
          <section className="empty-state">
            <p className="eyebrow">Records</p>
            <h2>Saved customer records</h2>
            <p>No records yet — saved eye tests will appear here.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
