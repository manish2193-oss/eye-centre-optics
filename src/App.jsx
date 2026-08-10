import { useState } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <div>
      <h1>Eye Centre Optics</h1>

      <button onClick={() => setActiveTab("new")}>
        New Record
      </button>

      <button onClick={() => setActiveTab("records")}>
        Records
      </button>

      {activeTab === "new" && (
        <div>
          <h2>New Customer Record</h2>

          <div>
            <label>Full Name *</label>
            <br />
            <input type="text" />
          </div>

          <br />

          <div>
            <label>Address *</label>
            <br />
            <input type="text" />
          </div>
        </div>
      )}

      {activeTab === "records" && (
        <div>
          <h2>Records</h2>
          <p>No records yet — saved eye tests will appear here.</p>
        </div>
      )}
    </div>
  );
}

export default App;