import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000";

const emptyQuote = {
  bid_date: "N/A",
  contact: [],
  project: "",
  to_company: "",
  attention: "",
  location: "",
  status: "Not Started",
  notes: "",
};

const emptyLineItem = {
  tag: "",
  vendor: "",
  qty: 1,
  description: "",
  item: "",
  type: "",
  series: "",
  model: "",
  part_number: "",
  list_price: 0,
  multiplier: 1,
  markup: 0,
  freight: 0,
  startup: 0,
  surcharge: 0,
  terms: "FFA",
  notes: "",
  included: false,
};

const emptyProduct = {
  name: "",
  vendor: "",
  manufacturer: "",
  category: "",
  type: "",
  series: "",
  model: "",
  part_number: "",
  description: "",
  list_price: 0,
  multiplier: 1,
  surcharge: 0,
  net_cost: 0,
  notes: "",
  is_active: true,
};

const emptyNote = {
  item: "",
  type: "",
  category: "",
  series: "",
  model: "",
  text: "",
  note_type: "standard",
  default_selected: false,
  sort_order: 0,
  is_active: true,
};

const emptyCompany = {
  name: "",
  type: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zipcode: "",
  notes: "",
  website: "",
  account_number: "",
  tax_id: "",
  payment_terms: "",
  is_active: true,
};

const emptyContact = {
  company_id: "",
  first_name: "",
  last_name: "",
  role: "",
  email: "",
  tel: "",
  mobile: "",
  notes: "",
  is_active: true,
};

function money(value) {
  const n = Number(value || 0);
  if (n === 0) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatContact(contact) {
  if (!contact) return "";
  if (Array.isArray(contact)) return contact.join(", ");
  try {
    const parsed = JSON.parse(contact);
    return Array.isArray(parsed) ? parsed.join(", ") : String(contact);
  } catch {
    return String(contact);
  }
}

function getLineDescription(item) {
  const selectedNotes = (item.notes_selected || [])
    .filter((n) => n.is_selected)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((n) => `• ${n.text}`);
  return [item.description, ...selectedNotes].filter(Boolean).join("\n");
}

export default function App() {
  const [tab, setTab] = useState("builder");

  const [quotes, setQuotes] = useState([]);
  const [quoteForm, setQuoteForm] = useState(emptyQuote);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [activeQuoteId, setActiveQuoteId] = useState(null);

  const [lineItemForm, setLineItemForm] = useState(emptyLineItem);
  const [editingLineItemId, setEditingLineItemId] = useState(null);
  const [draggedLineItem, setDraggedLineItem] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [notes, setNotes] = useState([]);

  const [lineProductResults, setLineProductResults] = useState([]);
  const [lineProductSearchMessage, setLineProductSearchMessage] = useState("");

  const [dashSearch, setDashSearch] = useState("");
  const [dashStatus, setDashStatus] = useState("");
  const [dashSort, setDashSort] = useState("id");
  const [dashDirection, setDashDirection] = useState("desc");

  const [productSearch, setProductSearch] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const [companyResults, setCompanyResults] = useState([]);
const [companySearchMessage, setCompanySearchMessage] = useState("");
const [selectedCompanyId, setSelectedCompanyId] = useState(null);

const [contactResults, setContactResults] = useState([]);
const [contactSearchMessage, setContactSearchMessage] = useState("");

  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);

  const [noteForm, setNoteForm] = useState(emptyNote);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [editingCompanyId, setEditingCompanyId] = useState(null);

  const [contactForm, setContactForm] = useState(emptyContact);
  const [editingContactId, setEditingContactId] = useState(null);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteLineItem, setNoteLineItem] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState([]);

  const activeQuote = quotes.find((q) => q.id === activeQuoteId);

  const calculatedPreview = useMemo(() => {
    const list = Number(lineItemForm.list_price || 0);
    const multiplier = Number(lineItemForm.multiplier || 1);
    const markup = Number(lineItemForm.markup || 0);
    const freight = Number(lineItemForm.freight || 0);
    const startup = Number(lineItemForm.startup || 0);
    const surcharge = Number(lineItemForm.surcharge || 0);
    const qty = Number(lineItemForm.qty || 1);
    const net = list * (1 + surcharge) * multiplier;
    const sell = Math.round(net * (1 + markup) + freight + startup);
    return { net, sell, total: sell * qty };
  }, [lineItemForm]);

  useEffect(() => {
    fetchQuotes();
    fetchCompanies();
    fetchContacts();
    fetchProducts();
    fetchNotes();
  }, []);

  async function fetchQuotes(params = {}) {
    const res = await axios.get(`${API}/quotes`, { params });
    setQuotes(res.data);
  }

  async function fetchDashboard() {
    await fetchQuotes({
      search: dashSearch,
      status: dashStatus,
      sort_by: dashSort,
      direction: dashDirection,
    });
  }

  async function fetchCompanies(search = "") {
    const res = await axios.get(`${API}/companies`, { params: { search } });
    setCompanies(res.data);
  }

  async function fetchContacts(search = "") {
    const res = await axios.get(`${API}/contacts`, { params: { search } });
    setContacts(res.data);
  }

  async function searchQuoteCompanies(term) {
  setQuoteForm((prev) => ({
    ...prev,
    to_company: term,
    attention: "",
  }));

  setSelectedCompanyId(null);
  setContactResults([]);
  setContactSearchMessage("");

  if (!term || term.length < 2) {
    setCompanyResults([]);
    setCompanySearchMessage("");
    return;
  }

  const res = await axios.get(`${API}/companies`, {
    params: { search: term },
  });

  setCompanyResults(res.data);

  if (res.data.length === 0) {
    setCompanySearchMessage("No company found yet. You can still type manually.");
  } else {
    setCompanySearchMessage("");
  }
}

function selectQuoteCompany(company) {
  setQuoteForm((prev) => ({
    ...prev,
    to_company: company.name,
    attention: "",
  }));

  setSelectedCompanyId(company.id);
  setCompanyResults([]);
  setCompanySearchMessage("");
}

async function searchQuoteContacts(term) {
  setQuoteForm((prev) => ({
    ...prev,
    attention: term,
  }));

  if (!selectedCompanyId) {
    setContactResults([]);
    setContactSearchMessage("Select a company first to search contacts.");
    return;
  }

  if (!term || term.length < 1) {
    setContactResults([]);
    setContactSearchMessage("");
    return;
  }

  const res = await axios.get(`${API}/contacts`, {
    params: {
      company_id: selectedCompanyId,
      search: term,
    },
  });

  setContactResults(res.data);

  if (res.data.length === 0) {
    setContactSearchMessage("No contact found for this company. You can still type manually.");
  } else {
    setContactSearchMessage("");
  }
}

function selectQuoteContact(contact) {
  const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();

  setQuoteForm((prev) => ({
    ...prev,
    attention: fullName,
  }));

  setContactResults([]);
  setContactSearchMessage("");
}

  async function fetchProducts(search = "") {
    const res = await axios.get(`${API}/products`, { params: { search } });
    setProducts(res.data);
  }

  async function searchLineProducts(term) {
  setLineItemForm((prev) => ({
    ...prev,
    item: term,
  }));

  if (!term || term.length < 2) {
    setLineProductResults([]);
    setLineProductSearchMessage("");
    return;
  }

  const res = await axios.get(`${API}/products`, {
    params: { search: term },
  });

  setLineProductResults(res.data);

  if (res.data.length === 0) {
    setLineProductSearchMessage("No product found yet. You can still type manually.");
  } else {
    setLineProductSearchMessage("");
  }
}

function selectLineProduct(p) {
  setLineItemForm((prev) => ({
    ...prev,
    item: p.category || "",
    type: p.type || "",
    series: p.series || "",
    model: p.model || "",
    part_number: p.part_number || "",
    vendor: p.vendor || "",
    description: p.description || "",
    list_price: p.list_price || 0,
    multiplier: p.multiplier || 1,
    surcharge: p.surcharge || 0,
  }));

  setLineProductResults([]);
  setLineProductSearchMessage("");
}

  async function fetchNotes(search = "") {
    const res = await axios.get(`${API}/notes-library`, { params: { search } });
    setNotes(res.data);
  }

  function updateForm(setter) {
    return (e) => {
      const { name, value, type, checked } = e.target;
      setter((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };
  }

  function handleQuoteContactInput(e) {
    const value = e.target.value;
    const arr = value.split(",").map((x) => x.trim()).filter(Boolean);
    setQuoteForm((prev) => ({ ...prev, contact: arr }));
  }

  async function saveQuote(e) {
    e.preventDefault();
    if (editingQuoteId) {
      const res = await axios.put(`${API}/quotes/${editingQuoteId}`, quoteForm);
      setActiveQuoteId(res.data.id);
      setEditingQuoteId(null);
    } else {
      const res = await axios.post(`${API}/quotes`, quoteForm);
      setActiveQuoteId(res.data.id);
    }
    setQuoteForm(emptyQuote);
    await fetchQuotes();
  }

  function editQuote(q) {
    setEditingQuoteId(q.id);
    setActiveQuoteId(q.id);
    setQuoteForm({
      bid_date: q.bid_date || "N/A",
      contact: Array.isArray(q.contact) ? q.contact : [],
      project: q.project || "",
      to_company: q.to_company || "",
      attention: q.attention || "",
      location: q.location || "",
      status: q.status || "Not Started",
      notes: q.notes || "",
    });
    setTab("builder");
  }

  async function deleteQuote(id) {
    if (!confirm("Delete this quote?")) return;
    await axios.delete(`${API}/quotes/${id}`);
    if (activeQuoteId === id) setActiveQuoteId(null);
    await fetchQuotes();
  }

  async function autofillFromProduct(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return;
    const res = await axios.get(`${API}/products/lookup`, { params: { term: searchTerm } });
    const p = res.data?.[0];
    if (!p) return;

    setLineItemForm((prev) => ({
      ...prev,
      item: p.category || prev.item,
      type: p.type || prev.type,
      series: p.series || prev.series,
      model: p.model || prev.model,
      part_number: p.part_number || prev.part_number,
      vendor: p.vendor || prev.vendor,
      description: p.description || prev.description,
      list_price: p.list_price || 0,
      multiplier: p.multiplier || 1,
      surcharge: p.surcharge || 0,
    }));
  }

  async function saveLineItem(e) {
    e.preventDefault();
    if (!activeQuoteId) {
      alert("Save or select a quote first.");
      return;
    }

    const payload = { ...lineItemForm };

    if (editingLineItemId) {
      await axios.put(`${API}/line-items/${editingLineItemId}`, payload);
      setEditingLineItemId(null);
    } else {
      await axios.post(`${API}/quotes/${activeQuoteId}/line-items`, payload);
    }

    setLineItemForm(emptyLineItem);
    await fetchQuotes();
  }

  function editLineItem(item) {
    setEditingLineItemId(item.id);
    setLineItemForm({ ...emptyLineItem, ...item });
  }

  async function deleteLineItem(id) {
    if (!confirm("Delete this line item?")) return;
    await axios.delete(`${API}/line-items/${id}`);
    await fetchQuotes();
  }

  async function dropLineItem(targetItemId) {
    if (!draggedLineItem || !activeQuote) return;
    if (draggedLineItem === targetItemId) return;

    const items = [...(activeQuote.line_items || [])];
    const from = items.findIndex((x) => x.id === draggedLineItem);
    const to = items.findIndex((x) => x.id === targetItemId);
    if (from < 0 || to < 0) return;

    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);

    await axios.put(`${API}/quotes/${activeQuote.id}/line-items/reorder`, {
      item_ids: items.map((x) => x.id),
    });
    setDraggedLineItem(null);
    await fetchQuotes();
  }

  async function openNotesModal(item) {
    setNoteLineItem(item);
    const res = await axios.get(`${API}/notes-library`, {
      params: {
        item: item.item || "",
        type: item.type || "",
        series: item.series || "",
        model: item.model || "",
      },
    });

    const selected = item.notes_selected || [];
    const drafts = res.data.map((n) => {
      const existing = selected.find((x) => x.note_library_id === n.id);
      return {
        note_library_id: n.id,
        category: n.category,
        label: "",
        text: existing?.text || n.text,
        note_type: n.note_type,
        is_custom: false,
        is_selected: existing ? existing.is_selected : !!n.default_selected,
        sort_order: existing?.sort_order || n.sort_order || 0,
      };
    });

    selected.filter((x) => x.is_custom).forEach((x) => drafts.push({ ...x }));
    setNoteDrafts(drafts);
    setNoteModalOpen(true);
  }

  async function saveLineItemNotes() {
    await axios.put(`${API}/line-items/${noteLineItem.id}/notes`, {
      notes: noteDrafts
        .filter((n) => n.is_selected || n.is_custom)
        .map((n, index) => ({ ...n, sort_order: index + 1 })),
    });
    setNoteModalOpen(false);
    setNoteLineItem(null);
    setNoteDrafts([]);
    await fetchQuotes();
  }

  function addCustomNote() {
    setNoteDrafts((prev) => [
      ...prev,
      {
        note_library_id: null,
        category: "",
        label: "",
        text: "",
        note_type: "additional",
        is_custom: true,
        is_selected: true,
        sort_order: prev.length + 1,
      },
    ]);
  }

  async function saveCrud(e, endpoint, form, editingId, reset, refresh, setEditing) {
    e.preventDefault();
    if (editingId) await axios.put(`${API}/${endpoint}/${editingId}`, form);
    else await axios.post(`${API}/${endpoint}`, form);
    reset();
    setEditing(null);
    await refresh();
  }

  async function deleteCrud(endpoint, id, refresh) {
    if (!confirm("Delete this record?")) return;
    await axios.delete(`${API}/${endpoint}/${id}`);
    await refresh();
  }

  function Dashboard() {
    return (
      <section className="screen">
        <div className="toolbar">
          <input placeholder="Search quote/customer/job/location..." value={dashSearch} onChange={(e) => setDashSearch(e.target.value)} />
          <select value={dashStatus} onChange={(e) => setDashStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Bid Submitted</option>
            <option>Not Bidding</option>
            <option>Won</option>
            <option>Lost</option>
          </select>
          <select value={dashSort} onChange={(e) => setDashSort(e.target.value)}>
            <option value="id">Created On</option>
            <option value="bid_date">Bid Due Date</option>
            <option value="status">Status</option>
            <option value="project">Job</option>
            <option value="to_company">Customer</option>
            <option value="attention">Attn</option>
            <option value="location">Location</option>
          </select>
          <select value={dashDirection} onChange={(e) => setDashDirection(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button className="btn primary" onClick={fetchDashboard}>Apply</button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Bid Due Date</th>
                <th>Created On</th>
                <th>Status</th>
                <th>Job</th>
                <th>Customer</th>
                <th>Attn</th>
                <th>Total</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{q.quote_number}</td>
                  <td>{q.bid_date}</td>
                  <td>{q.created_at || q.date}</td>
                  <td><span className="pill">{q.status}</span></td>
                  <td>{q.project}</td>
                  <td>{q.to_company}</td>
                  <td>{q.attention}</td>
                  <td>{money(q.total)}</td>
                  <td>{q.location}</td>
                  <td>
                    <button className="btn secondary" onClick={() => { setActiveQuoteId(q.id); setTab("builder"); }}>Open</button>
                    <button className="btn edit" onClick={() => editQuote(q)}>Edit</button>
                    <button className="btn delete" onClick={() => deleteQuote(q.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function Builder() {
    return (
      <section className="screen">
        <div className="two-panel">
          <form className="card form-grid" onSubmit={saveQuote}>
            <h3>{editingQuoteId ? "Edit Quote" : "Quote Form"}</h3>
            <input name="project" placeholder="Job / Project" value={quoteForm.project} onChange={updateForm(setQuoteForm)} />
<div className="lookup-field">
  <input
    name="to_company"
    placeholder="Search Customer / Company"
    value={quoteForm.to_company}
    onChange={(e) => searchQuoteCompanies(e.target.value)}
  />

  {companyResults.length > 0 && (
    <div className="lookup-results">
      {companyResults.slice(0, 8).map((company) => (
        <button
          type="button"
          key={company.id}
          className="lookup-option"
          onClick={() => selectQuoteCompany(company)}
        >
          <strong>{company.name}</strong>
          <span>{company.type || ""}</span>
        </button>
      ))}
    </div>
  )}

  {companySearchMessage && (
    <div className="lookup-message">{companySearchMessage}</div>
  )}
</div>

<div className="lookup-field">
  <input
    name="attention"
    placeholder="Search Contact / Attention"
    value={quoteForm.attention}
    onChange={(e) => searchQuoteContacts(e.target.value)}
  />

  {contactResults.length > 0 && (
    <div className="lookup-results">
      {contactResults.slice(0, 8).map((contact) => (
        <button
          type="button"
          key={contact.id}
          className="lookup-option"
          onClick={() => selectQuoteContact(contact)}
        >
          <strong>
            {`${contact.first_name || ""} ${contact.last_name || ""}`.trim()}
          </strong>
          <span>{contact.email || ""}</span>
        </button>
      ))}
    </div>
  )}

  {contactSearchMessage && (
    <div className="lookup-message">{contactSearchMessage}</div>
  )}
</div>
            <input name="location" placeholder="Location" value={quoteForm.location} onChange={updateForm(setQuoteForm)} />
            <input placeholder="Contacts, comma separated" value={formatContact(quoteForm.contact)} onChange={handleQuoteContactInput} />
            <input name="bid_date" placeholder="Bid Due Date" value={quoteForm.bid_date} onChange={updateForm(setQuoteForm)} />
            <select name="status" value={quoteForm.status} onChange={updateForm(setQuoteForm)}>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Bid Submitted</option>
              <option>Not Bidding</option>
              <option>Won</option>
              <option>Lost</option>
            </select>
            <textarea name="notes" placeholder="Quote Notes" value={quoteForm.notes} onChange={updateForm(setQuoteForm)} />
            <button className="btn primary">{editingQuoteId ? "Update Quote" : "Save Quote"}</button>
          </form>

          <div className="card">
            <h3>Active Quote</h3>
            {activeQuote ? (
              <>
                <p><b>{activeQuote.quote_number}</b></p>
                <p>{activeQuote.to_company} — {activeQuote.project}</p>
                <p>{formatContact(activeQuote.contact)}</p>
                <p><b>Total:</b> {money(activeQuote.total)}</p>
              </>
            ) : <p>Select or save a quote first.</p>}
          </div>
        </div>

        <form className="card line-grid" onSubmit={saveLineItem}>
          <h3>Line Item {activeQuote ? `for ${activeQuote.quote_number}` : ""}</h3>

          <textarea className="tag-textarea" name="tag" placeholder="Tag" value={lineItemForm.tag} onChange={updateForm(setLineItemForm)} />
          <div className="lookup-field">
  <input
    name="item"
    placeholder="Search item / model / part #"
    value={lineItemForm.item}
    onChange={(e) => searchLineProducts(e.target.value)}
  />

  {lineProductResults.length > 0 && (
    <div className="lookup-results">
      {lineProductResults.slice(0, 8).map((p) => (
        <button
          type="button"
          key={p.id}
          className="lookup-option"
          onClick={() => selectLineProduct(p)}
        >
          <strong>
            {p.model || p.part_number || p.name}
          </strong>

          <span>
            {p.vendor || ""} {p.series || ""}
          </span>

          <small>
            {p.description || ""}
          </small>
        </button>
      ))}
    </div>
  )}

  {lineProductSearchMessage && (
    <div className="lookup-message">
      {lineProductSearchMessage}
    </div>
  )}
</div>
          <input name="type" placeholder="Type" value={lineItemForm.type} onChange={updateForm(setLineItemForm)} />
          <input name="series" placeholder="Series" value={lineItemForm.series} onChange={updateForm(setLineItemForm)} />
          <input
  name="model"
  placeholder="Model"
  value={lineItemForm.model}
  onChange={updateForm(setLineItemForm)}
/>
          <input name="part_number" placeholder="Part #" value={lineItemForm.part_number} onChange={updateForm(setLineItemForm)} />
          <input name="vendor" placeholder="Vendor" value={lineItemForm.vendor} onChange={updateForm(setLineItemForm)} />
          <input name="qty" type="number" placeholder="Qty" value={lineItemForm.qty} onChange={updateForm(setLineItemForm)} />
          <textarea className="description-box" name="description" placeholder="Description" value={lineItemForm.description} onChange={updateForm(setLineItemForm)} />
          <input name="list_price" type="number" step="0.01" placeholder="List Price" value={lineItemForm.list_price} onChange={updateForm(setLineItemForm)} />
          <input name="multiplier" type="number" step="0.0001" placeholder="Multiplier" value={lineItemForm.multiplier} onChange={updateForm(setLineItemForm)} />
          <input name="markup" type="number" step="0.0001" placeholder="Markup .25" value={lineItemForm.markup} onChange={updateForm(setLineItemForm)} />
          <input name="freight" type="number" step="0.01" placeholder="Freight" value={lineItemForm.freight} onChange={updateForm(setLineItemForm)} />
          <input name="startup" type="number" step="0.01" placeholder="Startup" value={lineItemForm.startup} onChange={updateForm(setLineItemForm)} />
          <input name="surcharge" type="number" step="0.0001" placeholder="Surcharge .10" value={lineItemForm.surcharge} onChange={updateForm(setLineItemForm)} />
          <select name="terms" value={lineItemForm.terms} onChange={updateForm(setLineItemForm)}>
            <option value="FFA">FFA</option>
            <option value="FOB">FOB</option>
          </select>
          <label className="check"><input type="checkbox" name="included" checked={lineItemForm.included} onChange={updateForm(setLineItemForm)} /> Included</label>
          <input name="notes" placeholder="Internal Notes" value={lineItemForm.notes} onChange={updateForm(setLineItemForm)} />

          <div className="calc-box">Net: {money(calculatedPreview.net)} | Sell: {money(calculatedPreview.sell)} | Total: {money(calculatedPreview.total)}</div>
          <button className="btn primary">{editingLineItemId ? "Update Line Item" : "Add Line Item"}</button>
        </form>

        {activeQuote && (
          <div className="card table-wrap">
            <h3>Line Items</h3>
            <table className="line-items-table">
              <thead>
                <tr>
                  <th></th><th>Tag</th><th>Item</th><th>Type</th><th>Series</th><th>Model</th><th>Part #</th><th>Vendor</th><th>Qty</th><th>Description</th><th>Sell</th><th>Total</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeQuote.line_items || []).map((item) => (
                  <tr key={item.id}>
                    <td draggable onDragStart={() => setDraggedLineItem(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropLineItem(item.id)} className="drag">☰</td>
                    <td>{item.tag}</td>
                    <td>{item.item}</td>
                    <td>{item.type}</td>
                    <td>{item.series}</td>
                    <td>{item.model}</td>
                    <td>{item.part_number}</td>
                    <td>{item.vendor}</td>
                    <td>{item.qty}</td>
                    <td className="description-cell">{getLineDescription(item)}</td>
                    <td>{item.included ? "Included" : money(item.sell_price)}</td>
                    <td>{item.included ? "Included" : money(item.total_price)}</td>
                    <td>
                      <button className="btn edit" onClick={() => editLineItem(item)}>Edit</button>
                      <button className="btn secondary" onClick={() => openNotesModal(item)}>Notes</button>
                      <button className="btn delete" onClick={() => deleteLineItem(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function CrudTable({ type }) {
    const config = {
      products: {
        title: "Products",
        search: productSearch,
        setSearch: setProductSearch,
        refresh: () => fetchProducts(productSearch),
        endpoint: "products",
        form: productForm,
        setForm: setProductForm,
        empty: emptyProduct,
        editingId: editingProductId,
        setEditingId: setEditingProductId,
        rows: products,
        fields: ["name", "vendor", "manufacturer", "category", "type", "series", "model", "part_number", "description", "list_price", "multiplier", "surcharge", "notes"],
      },
      notes: {
        title: "Notes Library",
        search: noteSearch,
        setSearch: setNoteSearch,
        refresh: () => fetchNotes(noteSearch),
        endpoint: "notes-library",
        form: noteForm,
        setForm: setNoteForm,
        empty: emptyNote,
        editingId: editingNoteId,
        setEditingId: setEditingNoteId,
        rows: notes,
        fields: ["item", "type", "category", "series", "model", "note_type", "text", "sort_order"],
      },
      companies: {
        title: "Companies",
        search: companySearch,
        setSearch: setCompanySearch,
        refresh: () => fetchCompanies(companySearch),
        endpoint: "companies",
        form: companyForm,
        setForm: setCompanyForm,
        empty: emptyCompany,
        editingId: editingCompanyId,
        setEditingId: setEditingCompanyId,
        rows: companies,
        fields: ["name", "type", "address1", "address2", "city", "state", "zipcode", "website", "account_number", "payment_terms", "notes"],
      },
      contacts: {
        title: "Contacts",
        search: contactSearch,
        setSearch: setContactSearch,
        refresh: () => fetchContacts(contactSearch),
        endpoint: "contacts",
        form: contactForm,
        setForm: setContactForm,
        empty: emptyContact,
        editingId: editingContactId,
        setEditingId: setEditingContactId,
        rows: contacts,
        fields: ["company_id", "first_name", "last_name", "role", "email", "tel", "mobile", "notes"],
      },
    }[type];

    return (
      <section className="screen">
        <div className="toolbar">
          <input placeholder={`Search ${config.title}`} value={config.search} onChange={(e) => config.setSearch(e.target.value)} />
          <button className="btn primary" onClick={config.refresh}>Search</button>
        </div>

        <form className="card form-grid" onSubmit={(e) => saveCrud(e, config.endpoint, config.form, config.editingId, () => config.setForm(config.empty), config.refresh, config.setEditingId)}>
          <h3>{config.editingId ? `Edit ${config.title}` : `Add ${config.title}`}</h3>
          {type === "contacts" && (
            <select name="company_id" value={config.form.company_id} onChange={updateForm(config.setForm)}>
              <option value="">Select Company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {config.fields.filter((f) => !(type === "contacts" && f === "company_id")).map((field) =>
            field === "description" || field === "notes" || field === "text" ? (
              <textarea key={field} name={field} placeholder={field} value={config.form[field] || ""} onChange={updateForm(config.setForm)} />
            ) : field === "note_type" ? (
              <select key={field} name={field} value={config.form[field] || "standard"} onChange={updateForm(config.setForm)}>
                <option value="standard">standard</option>
                <option value="additional">additional</option>
                <option value="exception">exception</option>
                <option value="internal">internal</option>
              </select>
            ) : (
              <input key={field} name={field} placeholder={field} value={config.form[field] || ""} onChange={updateForm(config.setForm)} />
            )
          )}
          <button className="btn primary">{config.editingId ? "Update" : "Add"}</button>
          {config.editingId && <button type="button" className="btn secondary" onClick={() => { config.setEditingId(null); config.setForm(config.empty); }}>Cancel</button>}
        </form>

        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>{config.fields.slice(0, 8).map((f) => <th key={f}>{f}</th>)}<th>Actions</th></tr>
            </thead>
            <tbody>
              {config.rows.map((row) => (
                <tr key={row.id}>
                  {config.fields.slice(0, 8).map((f) => <td key={f}>{String(row[f] ?? "")}</td>)}
                  <td>
                    <button className="btn edit" onClick={() => { config.setEditingId(row.id); config.setForm({ ...config.empty, ...row }); }}>Edit</button>
                    <button className="btn delete" onClick={() => deleteCrud(config.endpoint, row.id, config.refresh)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <h2>Quote System</h2>
        <nav>
          <button className={tab === "builder" ? "active" : ""} onClick={() => setTab("builder")}>Quote Builder</button>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>Quote Dashboard</button>
          <button className={tab === "companies" ? "active" : ""} onClick={() => setTab("companies")}>Companies</button>
          <button className={tab === "contacts" ? "active" : ""} onClick={() => setTab("contacts")}>Contacts</button>
          <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
          <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>Notes Library</button>
        </nav>
      </header>

{tab === "builder" && Builder()}
{tab === "dashboard" && Dashboard()}
{tab === "companies" && CrudTable({ type: "companies" })}
{tab === "contacts" && CrudTable({ type: "contacts" })}
{tab === "products" && CrudTable({ type: "products" })}
{tab === "notes" && CrudTable({ type: "notes" })}

      {noteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3>Line Item Notes</h3>
              <button className="btn secondary" onClick={() => setNoteModalOpen(false)}>Close</button>
            </div>

            {["standard", "additional", "exception", "internal"].map((type) => (
              <div key={type} className="note-column">
                <h4>{type}</h4>
                {noteDrafts.filter((n) => n.note_type === type).map((n, index) => {
                  const globalIndex = noteDrafts.indexOf(n);
                  return (
                    <div key={`${type}-${index}`} className="note-row">
                      <input type="checkbox" checked={!!n.is_selected} onChange={(e) => {
                        const copy = [...noteDrafts];
                        copy[globalIndex].is_selected = e.target.checked;
                        setNoteDrafts(copy);
                      }} />
                      <textarea value={n.text || ""} onChange={(e) => {
                        const copy = [...noteDrafts];
                        copy[globalIndex].text = e.target.value;
                        setNoteDrafts(copy);
                      }} />
                      <button className="btn delete" onClick={() => setNoteDrafts(noteDrafts.filter((_, i) => i !== globalIndex))}>X</button>
                    </div>
                  );
                })}
              </div>
            ))}

            <button className="btn secondary" onClick={addCustomNote}>Add Custom Note</button>
            <button className="btn primary" onClick={saveLineItemNotes}>Save Notes</button>
          </div>
        </div>
      )}
    </div>
  );
}
