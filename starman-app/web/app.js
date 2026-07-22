import { api, auth } from "./api.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let ME = null, TEAM = [], CLIENTS = [], view = "dashboard", registerMode = false;

/* ---------- toast ---------- */
function toast(msg, type) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast on" + (type === "error" ? " error" : "");
  clearTimeout(t._); t._ = setTimeout(() => (t.className = "toast"), 3200);
}

/* ---------- auth ---------- */
$("#switchMode").onclick = () => {
  registerMode = !registerMode;
  $("#registerFields").classList.toggle("hidden", !registerMode);
  $("#loginBtn").textContent = registerMode ? "Create account" : "Log in";
  $("#switchMode").innerHTML = registerMode ? "Have an account? <b>Log in</b>" : "New advisor? <b>Create an account</b>";
};
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  $("#loginErr").textContent = "";
  try {
    if (registerMode) {
      const r = await api.register({
        name: $("#regName").value.trim(),
        email: $("#email").value.trim(), password: $("#password").value,
      });
      auth.token = r.token;
    } else {
      const r = await api.login($("#email").value.trim(), $("#password").value);
      auth.token = r.token;
    }
    await boot();
  } catch (err) {
    $("#loginErr").textContent = err.message || "Login failed";
  }
};
$("#logout").onclick = () => { auth.clear(); location.reload(); };

/* ---------- boot ---------- */
async function boot() {
  try {
    const me = await api.me();
    ME = me.user; TEAM = me.team || [];
    $("#login").classList.add("hidden");
    $("#app").classList.add("on");
    $("#me").innerHTML = `<b>${esc(ME.name)}</b><span>${esc(ME.title || ME.role)} · ${esc(me.org.name)}</span>`;
    bindShell();
    await refreshBell();
    go(view);
  } catch {
    auth.clear();
    $("#login").classList.remove("hidden");
    $("#app").classList.remove("on");
  }
}

function bindShell() {
  $("#nav").onclick = (e) => { const a = e.target.closest("a[data-view]"); if (a) go(a.dataset.view); };
  $("#newBtn").onclick = () => openForm(NEW_FORM_KEY[view] || "lead");
  $("#bell").onclick = openNotifs;
  $("#nclose").onclick = () => $("#ndrawer").classList.remove("on");
  $("#nreadall").onclick = async () => { await api.readAllNotifications(); await refreshBell(); openNotifs(); };
  $("#mclose").onclick = $("#mcancel").onclick = closeForm;
}

const TITLES = { dashboard: "Command Centre", clients: "Clients", households: "Households", leads: "Leads", intake: "Intake Centre", tasks: "Tasks", documents: "Documents", insurance: "Insurance", ai: "AI Support", integrations: "Integrations", meta: "Meta Ads Manager", advisorstream: "AdvisorStream", api: "API & Webhooks" };
const NEW_BTN = { leads: "+ New lead", intake: "+ New intake", clients: "+ New client", households: "+ New household", tasks: "+ New task", documents: "+ New document", insurance: "+ New insurance need" };
const NEW_FORM_KEY = { leads: "lead", intake: "intake", clients: "client", households: "household", tasks: "task", documents: "document", insurance: "insurance" };
function go(v) {
  const renderers = {
    dashboard: renderDashboard, clients: renderClients, households: renderHouseholds,
    leads: renderLeads, intake: renderIntakes, tasks: renderTasks, documents: renderDocuments,
    insurance: renderInsurance, ai: renderAi, integrations: renderIntegrations, meta: renderMeta,
    advisorstream: renderAdvisorStream, api: renderApi,
  };
  if (!renderers[v]) v = "dashboard";
  view = v;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
  $("#ttl").textContent = TITLES[v] || "Starman";
  const showNew = v in NEW_BTN;
  $("#newBtn").classList.toggle("hidden", !showNew);
  $("#newBtn").textContent = NEW_BTN[v] || "+ New";
  renderers[v]();
}

/* ---------- leads ---------- */
const STC = { NEW: "blue", CONTACTED: "amber", QUALIFIED: "amber", WON: "green", LOST: "red", NURTURE: "amber", DISCOVERY_BOOKED: "amber", PROPOSAL_SENT: "amber" };
async function renderLeads() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listLeads();
    $("#sub").textContent = `${data.length} lead${data.length === 1 ? "" : "s"} · saved to PostgreSQL`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Pipeline leads</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Name</th><th>Source</th><th>Est. AUM</th><th>Priority</th><th>Status</th><th>Advisor</th><th></th></tr></thead><tbody>
      ${data.map((l) => `<tr><td><b>${esc(l.firstName)} ${esc(l.lastName || "")}</b><br><small style="color:var(--muted)">${esc(l.email || "")}</small></td>
        <td>${esc(l.source || "—")}</td><td>$${Number(l.estimatedAum || 0).toLocaleString("en-CA")}</td>
        <td><span class="pill ${l.priority === "HIGH" ? "red" : l.priority === "LOW" ? "" : "amber"}">${esc(l.priority)}</span></td>
        <td><span class="pill ${STC[l.status] || "blue"}">${esc(l.status)}</span></td>
        <td>${esc(advName(l.advisorId))}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn" data-adv="${l.id}">Won</button> <button class="btn" data-del="${l.id}">✕</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No leads yet. Click <b>+ New lead</b> to create one — it persists in the database.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-adv]").forEach((b) => b.onclick = async () => { await api.updateLead(b.dataset.adv, { status: "WON" }); toast("Lead marked won"); renderLeads(); });
    $("#view").querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete this lead?")) { await api.deleteLead(b.dataset.del); toast("Lead deleted"); renderLeads(); } });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading leads: ${esc(e.message)}</div></div>`; }
}

/* ---------- intakes ---------- */
async function renderIntakes() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listIntakes();
    $("#sub").textContent = `${data.length} intake${data.length === 1 ? "" : "s"} · nothing disappears until archived`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Intake Centre</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Name</th><th>Type</th><th>Source</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
      ${data.map((i) => `<tr ${i.status === "ARCHIVED" ? 'style="opacity:.5"' : ""}><td><b>${esc(i.name)}</b></td><td>${esc(i.type)}</td><td>${esc(i.source || "—")}</td>
        <td><span class="pill ${i.priority === "HIGH" ? "red" : i.priority === "LOW" ? "" : "amber"}">${esc(i.priority)}</span></td>
        <td><span class="pill ${i.status === "CONVERTED" ? "green" : i.status === "ARCHIVED" ? "" : "blue"}">${esc(i.status)}</span></td>
        <td><small style="color:var(--muted)">${new Date(i.createdAt).toLocaleDateString()}</small></td>
        <td style="text-align:right;white-space:nowrap">
          ${i.status !== "CONVERTED" ? `<button class="btn" data-conv="${i.id}">Convert</button>` : ""}
          <button class="btn" data-rev="${i.id}">Review</button>
          <button class="btn" data-arch="${i.id}">Archive</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No new intakes yet. Click <b>+ New intake</b> to create one.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-conv]").forEach((b) => b.onclick = async () => { const r = await api.convertIntake(b.dataset.conv); toast("Converted to client: " + r.data.client.name); renderIntakes(); refreshBell(); });
    $("#view").querySelectorAll("[data-rev]").forEach((b) => b.onclick = async () => { await api.updateIntake(b.dataset.rev, { status: "NEEDS_REVIEW" }); toast("Marked Needs Review"); renderIntakes(); });
    $("#view").querySelectorAll("[data-arch]").forEach((b) => b.onclick = async () => { await api.updateIntake(b.dataset.arch, { status: "ARCHIVED" }); toast("Archived (kept for records)"); renderIntakes(); });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading intakes: ${esc(e.message)}</div></div>`; }
}

function advName(id) { const u = TEAM.find((t) => t.id === id); return u ? u.name : (id === ME?.id ? ME.name : "—"); }

/* ---------- dashboard ---------- */
async function renderDashboard() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.getDashboard();
    const k = data.kpis;
    $("#sub").textContent = "Firm snapshot · one round trip from Postgres";
    const tile = (label, value, sub) => `<div class="card" style="padding:16px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">${esc(label)}</div><div style="font-size:26px;font-weight:700;margin-top:4px">${value}</div>${sub ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${sub}</div>` : ""}</div>`;
    $("#view").innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">
      ${tile("Clients", k.clients, `$${k.aum.toLocaleString("en-CA")} AUM`)}
      ${tile("KYC overdue", k.kycOverdue, `${k.kycDueSoon} due soon`)}
      ${tile("Reviews overdue", k.reviewsOverdue, `${k.reviewsDueSoon} due soon`)}
      ${tile("Open tasks", k.openTasks, `${k.overdueTasks} overdue`)}
      ${tile("Open leads", k.openLeads, `$${k.pipelineAum.toLocaleString("en-CA")} pipeline`)}
      ${tile("Docs outstanding", k.docsOutstanding)}
      ${tile("Unread notifications", k.unreadNotifications)}
      ${tile("Total AUM", `$${k.aum.toLocaleString("en-CA")}`)}
    </div>
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start">
      <div class="card"><div class="ch"><h3>Today's priorities</h3></div><div class="pad">
        ${data.priorities.length ? `<table><thead><tr><th>Client</th><th>Reason</th><th>AUM</th></tr></thead><tbody>
        ${data.priorities.map((p) => `<tr><td><b>${esc(p.client)}</b></td><td><span class="pill ${p.severity === "high" ? "red" : "amber"}">${esc(p.reason)}</span><br><small style="color:var(--muted)">${esc(p.why)}</small></td><td>$${p.aum.toLocaleString("en-CA")}</td></tr>`).join("")}
        </tbody></table>` : `<div class="empty">Nothing urgent — you're caught up.</div>`}
      </div></div>
      <div class="card"><div class="ch"><h3>Recent activity</h3></div><div class="pad">
        ${data.recentAudit.length ? data.recentAudit.map((a) => `<div style="padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px"><b>${esc(a.action)}</b>${a.detail ? " — " + esc(a.detail) : ""}<br><small style="color:var(--muted)">${new Date(a.createdAt).toLocaleString()}</small></div>`).join("") : `<div class="empty">No activity yet.</div>`}
      </div></div>
    </div>`;
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading dashboard: ${esc(e.message)}</div></div>`; }
}

/* ---------- clients ---------- */
const KYCC = { OVERDUE: "red", DUE_SOON: "amber", CURRENT: "green", IN_PROGRESS: "" };
async function renderClients() {
  $("#sub").textContent = "Loading…";
  try {
    const { data, total } = await api.listClients();
    CLIENTS = data.map((c) => ({ id: c.id, name: c.name }));
    $("#sub").textContent = `${total} client${total === 1 ? "" : "s"} · saved to PostgreSQL`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Clients</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Name</th><th>Household</th><th>Segment</th><th>AUM</th><th>KYC</th><th>Advisor</th><th></th></tr></thead><tbody>
      ${data.map((c) => `<tr><td><b>${esc(c.name)}</b><br><small style="color:var(--muted)">${esc(c.email || "")}</small></td>
        <td>${esc(c.household?.name || "—")}</td><td>${esc(c.segment || "—")}</td><td>$${Number(c.aum || 0).toLocaleString("en-CA")}</td>
        <td><span class="pill ${KYCC[c.kycStatus] || ""}">${esc(c.kycStatus)}</span></td>
        <td>${esc(advName(c.advisorId))}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn" data-note="${c.id}">+ Note</button> <button class="btn" data-del="${c.id}">✕</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No clients yet. Click <b>+ New client</b> to create one — it persists in the database.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-note]").forEach((b) => b.onclick = async () => {
      const body = prompt("Note:"); if (!body) return;
      try { await api.addNote(b.dataset.note, { body }); toast("Note added"); } catch (e) { toast(e.message, "error"); }
    });
    $("#view").querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("Delete this client? This cannot be undone.")) return;
      try { await api.deleteClient(b.dataset.del); toast("Client deleted"); renderClients(); }
      catch (e) { toast(e.message, "error"); }
    });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading clients: ${esc(e.message)}</div></div>`; }
}

/* ---------- households ---------- */
async function renderHouseholds() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listHouseholds();
    $("#sub").textContent = `${data.length} household${data.length === 1 ? "" : "s"}`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Households</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Name</th><th>Members</th><th>Total AUM</th></tr></thead><tbody>
      ${data.map((h) => `<tr><td><b>${esc(h.name)}</b></td><td>${h.memberCount}</td><td>$${h.totalAum.toLocaleString("en-CA")}</td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No households yet. Click <b>+ New household</b> to create one.</div>`}
    </div></div>`;
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading households: ${esc(e.message)}</div></div>`; }
}

/* ---------- tasks ---------- */
const TSTC = { OPEN: "blue", IN_PROGRESS: "amber", DONE: "green" };
async function renderTasks() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listTasks();
    $("#sub").textContent = `${data.length} task${data.length === 1 ? "" : "s"}`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Tasks</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Title</th><th>Due</th><th>Priority</th><th>Status</th><th>Advisor</th><th></th></tr></thead><tbody>
      ${data.map((t) => `<tr><td><b>${esc(t.title)}</b>${t.notes ? `<br><small style="color:var(--muted)">${esc(t.notes)}</small>` : ""}</td>
        <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
        <td><span class="pill ${t.priority === "HIGH" ? "red" : t.priority === "LOW" ? "" : "amber"}">${esc(t.priority)}</span></td>
        <td><span class="pill ${TSTC[t.status] || "blue"}">${esc(t.status)}</span></td>
        <td>${esc(advName(t.advisorId))}</td>
        <td style="text-align:right;white-space:nowrap">${t.status !== "DONE" ? `<button class="btn" data-done="${t.id}">Done</button>` : ""} <button class="btn" data-del="${t.id}">✕</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No tasks yet. Click <b>+ New task</b> to create one.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-done]").forEach((b) => b.onclick = async () => { await api.updateTask(b.dataset.done, { status: "DONE" }); toast("Task completed"); renderTasks(); });
    $("#view").querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete this task?")) { await api.deleteTask(b.dataset.del); toast("Task deleted"); renderTasks(); } });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading tasks: ${esc(e.message)}</div></div>`; }
}

/* ---------- documents ---------- */
const DSTC = { Requested: "blue", Sent: "amber", Viewed: "amber", Signed: "green", Declined: "red", Expired: "red" };
const DOC_NEXT = { Requested: "Sent", Sent: "Viewed", Viewed: "Signed" };
async function renderDocuments() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listDocuments();
    $("#sub").textContent = `${data.length} document${data.length === 1 ? "" : "s"}`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Documents</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Type</th><th>Client</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>
      ${data.map((d) => `<tr><td><b>${esc(d.docType)}</b></td><td>${esc(d.client?.name || "—")}</td>
        <td>${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "—"}</td>
        <td><span class="pill ${d.priority === "HIGH" ? "red" : d.priority === "LOW" ? "" : "amber"}">${esc(d.priority)}</span></td>
        <td><span class="pill ${DSTC[d.status] || "blue"}">${esc(d.status)}</span></td>
        <td style="text-align:right;white-space:nowrap">${DOC_NEXT[d.status] ? `<button class="btn" data-adv="${d.id}">Mark ${esc(DOC_NEXT[d.status])}</button>` : ""}</td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No documents yet. Click <b>+ New document</b> to create one.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-adv]").forEach((b) => b.onclick = async () => {
      const doc = data.find((d) => d.id === b.dataset.adv);
      const next = DOC_NEXT[doc.status]; if (!next) return;
      await api.updateDocument(b.dataset.adv, { status: next }); toast(`Marked ${next}`); renderDocuments();
    });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading documents: ${esc(e.message)}</div></div>`; }
}

/* ---------- insurance ---------- */
async function renderInsurance() {
  $("#sub").textContent = "Loading…";
  try {
    const { data } = await api.listInsurance();
    $("#sub").textContent = `${data.length} insurance need${data.length === 1 ? "" : "s"}`;
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Insurance needs</h3></div><div class="pad">
      ${data.length ? `<table><thead><tr><th>Client</th><th>Coverage</th><th>Amount</th><th>Existing</th><th>Advisor</th><th></th></tr></thead><tbody>
      ${data.map((n) => `<tr><td><b>${esc(n.clientName)}</b></td><td>${esc((n.coverage || []).join(", ") || "—")}</td>
        <td>$${Number(n.amount || 0).toLocaleString("en-CA")}</td><td>${esc(n.existing || "—")}</td>
        <td>${esc(advName(n.advisorId))}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn" data-del="${n.id}">✕</button></td></tr>`).join("")}
      </tbody></table>` : `<div class="empty">No insurance needs logged yet. Click <b>+ New insurance need</b> to create one.</div>`}
    </div></div>`;
    $("#view").querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete this insurance need?")) { await api.deleteInsurance(b.dataset.del); toast("Deleted"); renderInsurance(); } });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error loading insurance needs: ${esc(e.message)}</div></div>`; }
}

/* ---------- AI Support (grounded on CRM data + knowledge docs) ---------- */
let _aiHistory = [];
const MODE_LABEL = { simulated: "Simulated (no model)", "simulated-fallback": "Simulated (model error)", openai: "OpenAI", azure: "Azure OpenAI (Canada)", local: "Self-hosted model" };
async function renderAi() {
  let info = { provider: "simulated", configured: false }; try { info = await api.aiInfo(); } catch {}
  let docs = []; try { docs = (await api.aiListDocs()).data; } catch {}
  $("#sub").textContent = "Answers grounded on your CRM data + uploaded documents — no web access";
  const badge = info.configured ? `<span class="pill green">${esc(MODE_LABEL[info.provider] || info.provider)} · ${esc(info.model || "")}</span>` : `<span class="pill amber">Simulated mode — connect a model in server settings</span>`;
  $("#view").innerHTML = `
  <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:18px;align-items:start">
    <div class="card" style="display:flex;flex-direction:column;min-height:540px">
      <div class="ch"><h3>Starman AI Support</h3><span style="margin-left:auto">${badge}</span></div>
      <div class="pad" style="flex:1;display:flex;flex-direction:column">
        <div id="aiThread" style="flex:1;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--canvas);min-height:300px"></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin:10px 0">
          ${["Which clients have overdue KYC?", "Summarize my book", "What's in the intake queue?", "Draft a follow-up email for my newest lead"].map((p) => `<button class="btn" data-chip="${esc(p)}">${esc(p)}</button>`).join("")}
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <textarea id="aiInput" rows="2" placeholder="Ask about your clients, leads, KYC, documents…" style="flex:1;resize:none"></textarea>
          <button class="btn pri" id="aiSend">Send</button>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">Guidance only — verify before client advice or compliance decisions. No web browsing; the assistant only sees your data.</div>
      </div>
    </div>
    <div class="card"><div class="ch"><h3>Knowledge documents</h3></div><div class="pad">
      <p style="font-size:12.5px;color:var(--muted)">Paste text the assistant can use as a source (policies, product notes, meeting notes). It's stored in your database and never sent to the web.</p>
      <input id="docTitle" placeholder="Document title" style="margin-bottom:8px">
      <textarea id="docText" rows="4" placeholder="Paste document text here…"></textarea>
      <button class="btn pri" id="docAdd" style="margin-top:8px">Add document</button>
      <div style="margin-top:12px">
        ${docs.length ? docs.map((d) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px"><b style="flex:1">${esc(d.title)}</b><button class="btn" data-deldoc="${d.id}" style="padding:3px 8px">✕</button></div>`).join("") : `<div class="empty" style="padding:16px">No documents yet.</div>`}
      </div>
    </div></div>
  </div>`;
  paintThread();
  $("#aiSend").onclick = aiSendMsg;
  $("#aiInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiSendMsg(); } });
  $("#view").querySelectorAll("[data-chip]").forEach((b) => b.onclick = () => { $("#aiInput").value = b.dataset.chip; aiSendMsg(); });
  $("#docAdd").onclick = async () => {
    const title = $("#docTitle").value.trim(), text = $("#docText").value.trim();
    if (!title || !text) { toast("Add a title and some text", "error"); return; }
    try { await api.aiAddDoc({ title, text }); toast("Document added"); renderAi(); } catch (e) { toast(e.message, "error"); }
  };
  $("#view").querySelectorAll("[data-deldoc]").forEach((b) => b.onclick = async () => { await api.aiDeleteDoc(b.dataset.deldoc); toast("Removed"); renderAi(); });
}
function paintThread() {
  const box = $("#aiThread"); if (!box) return;
  box.innerHTML = _aiHistory.length ? _aiHistory.map((m) => `<div style="margin-bottom:12px;text-align:${m.role === "user" ? "right" : "left"}">
      <div style="display:inline-block;max-width:88%;padding:9px 13px;border-radius:13px;font-size:13px;line-height:1.5;white-space:pre-wrap;${m.role === "user" ? "background:var(--brand);color:#fff" : "background:#fff;border:1px solid var(--line)"}">${esc(m.content)}</div>
    </div>`).join("") : `<div class="empty">Ask anything about your clients, leads, KYC, or documents. I answer only from your data.</div>`;
  box.scrollTop = box.scrollHeight;
}
async function aiSendMsg() {
  const inp = $("#aiInput"); const msg = (inp.value || "").trim(); if (!msg) return;
  inp.value = "";
  _aiHistory.push({ role: "user", content: msg }); paintThread();
  _aiHistory.push({ role: "assistant", content: "…thinking" }); paintThread();
  try {
    const r = await api.aiChat(msg, _aiHistory.filter((m) => m.content !== "…thinking").slice(-8));
    _aiHistory = _aiHistory.filter((m) => m.content !== "…thinking");
    _aiHistory.push({ role: "assistant", content: r.answer });
  } catch (e) {
    _aiHistory = _aiHistory.filter((m) => m.content !== "…thinking");
    _aiHistory.push({ role: "assistant", content: "Error: " + e.message });
  }
  paintThread();
}

/* ---------- integrations ---------- */
const CSTAT = { CONNECTED: ["green", "Connected"], NOT_CONFIGURED: ["", "Not configured"], NEEDS_ATTENTION: ["amber", "Needs attention"], LOCKED: ["red", "Locked"], DISABLED: ["", "Disabled"] };
async function renderIntegrations() {
  $("#sub").textContent = "Connector health · credentials handled server-side";
  try {
    const { data } = await api.listConnectors();
    $("#view").innerHTML = `<div class="card"><div class="ch"><h3>Connectors</h3></div><div class="pad">
      <table><thead><tr><th>Provider</th><th>Status</th><th>Last sync</th><th>Notes</th><th></th></tr></thead><tbody>
      ${data.map((c) => { const [cls, lbl] = CSTAT[c.status] || ["", c.status]; const locked = c.status === "LOCKED"; const note = (c.config && c.config.note) || "—";
        return `<tr><td><b>${esc(c.displayName)}</b><br><small style="color:var(--muted)">${esc(c.provider)}</small></td>
        <td><span class="pill ${cls}">${esc(lbl)}</span></td>
        <td><small style="color:var(--muted)">${c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "—"}</small></td>
        <td style="max-width:320px"><small style="color:var(--muted)">${esc(note)}</small></td>
        <td style="text-align:right;white-space:nowrap">${locked
          ? `<span class="pill red">Manual CSV only</span>`
          : `<button class="btn" data-test="${c.provider}">Test</button> <button class="btn pri" data-sync="${c.provider}">Sync</button>`}</td></tr>`; }).join("")}
      </tbody></table>
      <p style="font-size:11.5px;color:var(--muted);margin-top:12px">Canada Life and Quadrus stay locked until official API access and dealer/compliance approval are confirmed — no screen scraping, no password storage. Use manual CSV import in the meantime.</p>
    </div></div>`;
    $("#view").querySelectorAll("[data-test]").forEach((b) => b.onclick = async () => { const r = await api.testConnector(b.dataset.test); toast(r.message, r.ok ? "" : "error"); });
    $("#view").querySelectorAll("[data-sync]").forEach((b) => b.onclick = async () => { const r = await api.syncConnector(b.dataset.sync); toast(r.message); refreshBell(); });
  } catch (e) { $("#view").innerHTML = `<div class="card"><div class="empty">Error: ${esc(e.message)}</div></div>`; }
}

/* ---------- Meta Ads Manager ---------- */
async function renderMeta() {
  $("#sub").textContent = "Meta Ads Manager / Business Suite · campaigns, ad sets & lead import";
  let conn = {}; try { conn = (await api.listConnectors()).data.find((c) => c.provider === "meta_ads") || {}; } catch {}
  let intakes = []; try { intakes = (await api.listIntakes("?type=meta")).data; } catch {}
  const status = CSTAT[conn.status] || ["", conn.status || "—"];
  const campaigns = [
    { name: "Q2 Retirement Readiness", status: "Active", spend: 1840, leads: 22, cpl: 84 },
    { name: "FHSA First-Home Buyers", status: "Active", spend: 920, leads: 14, cpl: 66 },
    { name: "Business Owner Insurance", status: "Paused", spend: 540, leads: 5, cpl: 108 },
  ];
  $("#view").innerHTML = `
  <div class="card"><div class="ch"><h3>Connection</h3><span class="pill ${status[0]}" style="margin-left:auto">${esc(status[1])}</span></div><div class="pad">
    <div class="grid2">
      <div><label>App ID</label><input id="meta-appId" value="${esc(conn.config?.appId || "")}" placeholder="Meta app ID"></div>
      <div><label>Ad account ID</label><input id="meta-adAccountId" value="${esc(conn.config?.adAccountId || "")}" placeholder="act_..."></div>
      <div><label>Page ID</label><input id="meta-pageId" value="${esc(conn.config?.pageId || "")}"></div>
      <div><label>Lead form ID</label><input id="meta-leadFormId" value="${esc(conn.config?.leadFormId || "")}"></div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:8px">Access tokens are exchanged and stored <b>server-side</b> via OAuth — never entered or kept in the browser. (Demo mode simulates sync.)</p>
    <div style="margin-top:12px;display:flex;gap:8px"><button class="btn" id="meta-save">Save config</button><button class="btn pri" id="meta-sync">Sync leads from Meta</button></div>
  </div></div>
  <div class="card"><div class="ch"><h3>Campaigns &amp; ad sets</h3><span class="muted" style="margin-left:auto">illustrative</span></div><div class="pad">
    <table><thead><tr><th>Campaign</th><th>Status</th><th>Spend</th><th>Leads</th><th>Cost / lead</th></tr></thead><tbody>
    ${campaigns.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td><span class="pill ${c.status === "Active" ? "green" : "amber"}">${esc(c.status)}</span></td><td>$${c.spend.toLocaleString("en-CA")}</td><td>${c.leads}</td><td>$${c.cpl}</td></tr>`).join("")}
    </tbody></table></div></div>
  <div class="card"><div class="ch"><h3>Imported Meta leads</h3><span class="muted" style="margin-left:auto">${intakes.length} in Intake Centre</span></div><div class="pad">
    ${intakes.length ? `<table><thead><tr><th>Name</th><th>Source</th><th>Status</th></tr></thead><tbody>${intakes.map((i) => `<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.source || "Meta")}</td><td><span class="pill blue">${esc(i.status)}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No Meta leads imported yet. Click <b>Sync leads from Meta</b>.</div>`}
  </div></div>`;
  $("#meta-save").onclick = async () => {
    await api.saveConnector("meta_ads", { config: { appId: v("meta-appId"), adAccountId: v("meta-adAccountId"), pageId: v("meta-pageId"), leadFormId: v("meta-leadFormId") } });
    toast("Meta config saved");
  };
  $("#meta-sync").onclick = async () => { const r = await api.syncConnector("meta_ads"); toast(r.message); refreshBell(); renderMeta(); };
}

/* ---------- AdvisorStream ---------- */
async function renderAdvisorStream() {
  $("#sub").textContent = "AdvisorStream · newsletter engagement & follow-ups";
  let conn = {}; try { conn = (await api.listConnectors()).data.find((c) => c.provider === "advisorstream") || {}; } catch {}
  let intakes = []; try { intakes = (await api.listIntakes("?type=advisorstream")).data; } catch {}
  const status = CSTAT[conn.status] || ["", conn.status || "—"];
  const engagement = [
    { client: "Rahman Household", article: "RESP strategies as kids approach university", action: "Clicked CTA", score: 92 },
    { client: "Geneviève Lapointe", article: "First Home Savings Account explained", action: "Opened + forwarded", score: 74 },
    { client: "Robert & Linda Chen", article: "2026 Budget — what it means for retirees", action: "Read 4 min", score: 68 },
  ];
  $("#view").innerHTML = `
  <div class="card"><div class="ch"><h3>Connection</h3><span class="pill ${status[0]}" style="margin-left:auto">${esc(status[1])}</span></div><div class="pad">
    <div class="grid2">
      <div><label>Import method</label><select id="as-method"><option ${conn.config?.importMethod === "API" ? "selected" : ""}>API</option><option>Zapier</option><option>Webhook</option><option>CSV</option></select></div>
      <div><label>Topic field</label><input id="as-topic" value="${esc(conn.config?.topicField || "topic")}"></div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px"><button class="btn" id="as-save">Save config</button><button class="btn pri" id="as-sync">Sync engagement</button></div>
  </div></div>
  <div class="card"><div class="ch"><h3>Recent engagement</h3><span class="muted" style="margin-left:auto">illustrative</span></div><div class="pad">
    <table><thead><tr><th>Client</th><th>Article</th><th>Action</th><th>Score</th></tr></thead><tbody>
    ${engagement.map((e) => `<tr><td><b>${esc(e.client)}</b></td><td>${esc(e.article)}</td><td>${esc(e.action)}</td><td><span class="pill ${e.score > 80 ? "green" : "amber"}">${e.score}</span></td></tr>`).join("")}
    </tbody></table></div></div>
  <div class="card"><div class="ch"><h3>Follow-ups created</h3><span class="muted" style="margin-left:auto">${intakes.length} in Intake Centre</span></div><div class="pad">
    ${intakes.length ? `<table><tbody>${intakes.map((i) => `<tr><td><b>${esc(i.name)}</b></td><td><span class="pill blue">${esc(i.status)}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No follow-ups yet. Click <b>Sync engagement</b>.</div>`}
  </div></div>`;
  $("#as-save").onclick = async () => { await api.saveConnector("advisorstream", { config: { importMethod: v("as-method"), topicField: v("as-topic") } }); toast("AdvisorStream config saved"); };
  $("#as-sync").onclick = async () => { const r = await api.syncConnector("advisorstream"); toast(r.message); refreshBell(); renderAdvisorStream(); };
}

/* ---------- API & Webhooks ---------- */
let _lastKeySecret = null;
async function renderApi() {
  $("#sub").textContent = "Org API keys for the public integration API (/api/v1)";
  let keys = []; try { keys = (await api.listApiKeys()).data; } catch {}
  const origin = location.origin;
  const secretBox = _lastKeySecret ? `<div style="background:#fff8e9;border:1px solid #f0e2c0;border-radius:9px;padding:12px;margin-bottom:12px;font-size:12.5px"><b>Copy your key now — it won't be shown again:</b><br><code style="word-break:break-all">${esc(_lastKeySecret)}</code></div>` : "";
  _lastKeySecret = null;
  $("#view").innerHTML = `
  <div class="card"><div class="ch"><h3>API keys</h3><button class="btn pri" style="margin-left:auto" id="newKey">+ New key</button></div><div class="pad">
    <div id="newSecret">${secretBox}</div>
    ${keys.length ? `<table><thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>
    ${keys.map((k) => `<tr><td><b>${esc(k.name)}</b></td><td><code>${esc(k.prefix)}…</code></td><td><small>${esc((k.scopes || []).join(", "))}</small></td><td><small style="color:var(--muted)">${k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}</small></td><td><span class="pill ${k.revoked ? "red" : "green"}">${k.revoked ? "Revoked" : "Active"}</span></td><td style="text-align:right">${k.revoked ? "" : `<button class="btn" data-rev="${k.id}">Revoke</button>`}</td></tr>`).join("")}
    </tbody></table>` : `<div class="empty">No API keys yet. Create one to let partner systems push leads/intakes.</div>`}
  </div></div>
  <div class="card"><div class="ch"><h3>Endpoints &amp; examples</h3></div><div class="pad" style="font-size:13px;line-height:1.7">
    <p>Authenticate every request with the <code>x-api-key</code> header. Base URL: <code>${esc(origin)}/api/v1</code></p>
    <pre style="background:var(--canvas);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:12px"># List leads
curl -H "x-api-key: sk_live_..." ${esc(origin)}/api/v1/leads

# Create a lead (e.g. from a website form or Zapier)
curl -X POST ${esc(origin)}/api/v1/leads \\
  -H "x-api-key: sk_live_..." -H "Content-Type: application/json" \\
  -d '{"firstName":"Sarah","lastName":"Mitchell","email":"sarah@x.ca","source":"website"}'

# Create an intake
curl -X POST ${esc(origin)}/api/v1/intakes \\
  -H "x-api-key: sk_live_..." -H "Content-Type: application/json" \\
  -d '{"type":"lead","name":"Walk-in enquiry","source":"front desk"}'</pre>
    <p style="font-size:11.5px;color:var(--muted)">Scopes: <code>leads:read</code>, <code>leads:write</code>, <code>intakes:write</code>. Keys are shown once on creation and stored only as a hash. Owner role required to create/revoke. <b>Webhooks (Meta lead-ads, DocuSign envelope status) connect to these endpoints server-side.</b></p>
  </div></div>`;
  $("#newKey").onclick = async () => {
    const name = prompt("Name this API key (e.g. 'Website form', 'Zapier'):");
    if (!name) return;
    try {
      const r = await api.createApiKey({ name });
      _lastKeySecret = r.secret;
      toast("API key created");
      renderApi();
    } catch (e) { toast(e.message, "error"); }
  };
  $("#view").querySelectorAll("[data-rev]").forEach((b) => b.onclick = async () => { if (confirm("Revoke this key? Integrations using it will stop working.")) { await api.revokeApiKey(b.dataset.rev); toast("Key revoked"); renderApi(); } });
}
const v = (id) => (document.getElementById(id)?.value || "").trim();

/* ---------- forms ---------- */
const FORMS = {
  lead: { title: "New Lead", fields: [
    { n: "firstName", label: "First name", req: true }, { n: "lastName", label: "Last name" },
    { n: "email", label: "Email", type: "email" }, { n: "phone", label: "Phone" },
    { n: "source", label: "Source", type: "select", opts: ["Referral", "Web / Meta", "Seminar", "Centre of influence", "AdvisorStream"] },
    { n: "estimatedAum", label: "Estimated AUM ($)", type: "number" },
    { n: "priority", label: "Priority", type: "select", opts: ["LOW", "MED", "HIGH"], def: "MED" },
    { n: "advisorId", label: "Assigned advisor", type: "advisor" },
    { n: "notes", label: "Notes", type: "textarea", full: true },
  ]},
  intake: { title: "New Intake", fields: [
    { n: "type", label: "Intake type", type: "select", opts: ["lead", "client", "insurance", "kyc", "document", "meeting", "advisorstream", "meta", "other"] },
    { n: "name", label: "Name", req: true }, { n: "email", label: "Email", type: "email" }, { n: "phone", label: "Phone" },
    { n: "source", label: "Source", type: "select", opts: ["Referral", "Web / Meta", "Seminar", "Walk-in", "AdvisorStream"] },
    { n: "priority", label: "Priority", type: "select", opts: ["LOW", "MED", "HIGH"], def: "MED" },
    { n: "advisorId", label: "Assigned advisor", type: "advisor" },
    { n: "reason", label: "Reason for inquiry", type: "textarea", full: true },
  ]},
  client: { title: "New Client", fields: [
    { n: "name", label: "Name", req: true }, { n: "email", label: "Email", type: "email" }, { n: "phone", label: "Phone" },
    { n: "city", label: "City" }, { n: "province", label: "Province" },
    { n: "segment", label: "Segment", type: "select", opts: ["Retail", "Affluent", "High Net Worth", "Business"], def: "Retail" },
    { n: "risk", label: "Risk profile", type: "select", opts: ["Conservative", "Balanced", "Growth", "Aggressive"], def: "Balanced" },
    { n: "aum", label: "AUM ($)", type: "number" },
    { n: "kycStatus", label: "KYC status", type: "select", opts: ["IN_PROGRESS", "CURRENT", "DUE_SOON", "OVERDUE"], def: "IN_PROGRESS" },
    { n: "advisorId", label: "Assigned advisor", type: "advisor" },
  ]},
  household: { title: "New Household", fields: [
    { n: "name", label: "Household name", req: true, full: true },
  ]},
  task: { title: "New Task", fields: [
    { n: "title", label: "Title", req: true, full: true },
    { n: "clientId", label: "Client", type: "client" },
    { n: "dueDate", label: "Due date", type: "date" },
    { n: "priority", label: "Priority", type: "select", opts: ["LOW", "MED", "HIGH"], def: "MED" },
    { n: "advisorId", label: "Assigned advisor", type: "advisor" },
    { n: "notes", label: "Notes", type: "textarea", full: true },
  ]},
  document: { title: "New Document", fields: [
    { n: "docType", label: "Document type", req: true },
    { n: "clientId", label: "Client", type: "client" },
    { n: "status", label: "Status", type: "select", opts: ["Requested", "Sent", "Viewed", "Signed", "Declined", "Expired"], def: "Requested" },
    { n: "priority", label: "Priority", type: "select", opts: ["LOW", "MED", "HIGH"], def: "MED" },
    { n: "delivery", label: "Delivery", type: "select", opts: ["Email", "E-signature", "Client portal", "Mail"] },
    { n: "dueDate", label: "Due date", type: "date" },
    { n: "notes", label: "Notes", type: "textarea", full: true },
  ]},
  insurance: { title: "New Insurance Need", fields: [
    { n: "clientName", label: "Client name", req: true },
    { n: "amount", label: "Coverage amount ($)", type: "number" },
    { n: "existing", label: "Existing coverage" },
    { n: "advisorId", label: "Assigned advisor", type: "advisor" },
    { n: "notes", label: "Notes", type: "textarea", full: true },
  ]},
};
let _formKey = null;
async function openForm(key) {
  _formKey = key; const def = FORMS[key];
  if (def.fields.some((f) => f.type === "client") && !CLIENTS.length) {
    try { CLIENTS = (await api.listClients()).data.map((c) => ({ id: c.id, name: c.name })); } catch { /* form still usable without client list */ }
  }
  $("#mtitle").textContent = def.title;
  $("#mbody").innerHTML = `<div class="grid2">${def.fields.map(fieldHTML).join("")}</div>`;
  $("#msave").onclick = () => submitForm(key);
  $("#ov").classList.add("on");
  setTimeout(() => $("#mbody").querySelector("input,select,textarea")?.focus(), 60);
}
function closeForm() { $("#ov").classList.remove("on"); }
function fieldHTML(f) {
  const id = "ff-" + f.n, full = f.full ? ' style="grid-column:1/-1"' : "";
  let inp;
  if (f.type === "textarea") inp = `<textarea id="${id}" rows="3"></textarea>`;
  else if (f.type === "select") inp = `<select id="${id}">${f.opts.map((o) => `<option ${f.def === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  else if (f.type === "advisor") inp = `<select id="${id}"><option value="">— Unassigned (defaults to you) —</option>${TEAM.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select>`;
  else if (f.type === "client") inp = `<select id="${id}"><option value="">— No client —</option>${CLIENTS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>`;
  else inp = `<input id="${id}" type="${f.type || "text"}">`;
  return `<div${full}><label>${esc(f.label)}${f.req ? " *" : ""}</label>${inp}</div>`;
}
async function submitForm(key) {
  const def = FORMS[key], d = {}; let missing = [];
  def.fields.forEach((f) => {
    const el = document.getElementById("ff-" + f.n); let v = el ? el.value.trim() : "";
    if (f.req && !v) { missing.push(f.label); el.style.borderColor = "var(--red)"; } else if (el) el.style.borderColor = "var(--line)";
    if (f.type === "number") v = v ? Number(v) : 0;
    if (v !== "" && v !== undefined) d[f.n] = v;
  });
  if (missing.length) { toast("Required: " + missing.join(", "), "error"); return; }
  try {
    const CREATORS = {
      lead: async () => { const r = await api.createLead(d); toast("Lead created: " + r.data.firstName); },
      intake: async () => { const r = await api.createIntake(d); toast("Intake created: " + r.data.name); },
      client: async () => { const r = await api.createClient(d); toast("Client created: " + r.data.name); },
      household: async () => { const r = await api.createHousehold(d); toast("Household created: " + r.data.name); },
      task: async () => { const r = await api.createTask(d); toast("Task created: " + r.data.title); },
      document: async () => { const r = await api.createDocument(d); toast("Document requested: " + r.data.docType); },
      insurance: async () => { const r = await api.createInsurance(d); toast("Insurance need logged: " + r.data.clientName); },
    };
    await (CREATORS[key] || CREATORS.lead)();
    closeForm(); await refreshBell(); go(view);
  } catch (e) { toast(e.message || "Save failed", "error"); }
}

/* ---------- notifications ---------- */
async function refreshBell() {
  try {
    const { unread } = await api.listNotifications();
    const b = $("#bdg");
    if (unread > 0) { b.textContent = unread > 99 ? "99+" : unread; b.classList.remove("hidden"); }
    else b.classList.add("hidden");
  } catch { /* ignore */ }
}
async function openNotifs() {
  const { data } = await api.listNotifications();
  $("#nbody").innerHTML = data.length ? data.map((n) => `<div class="nrow ${n.read ? "" : "unread"}" data-n="${n.id}" data-route="${esc(n.route || "")}">
      <div class="t">${esc(n.title)}</div><div class="m">${esc(n.message || "")}</div></div>`).join("")
    : `<div class="empty">You're all caught up.</div>`;
  $("#nbody").querySelectorAll("[data-n]").forEach((el) => el.onclick = async () => {
    await api.readNotification(el.dataset.n);
    const r = el.dataset.route; if (r && TITLES[r]) go(r);
    $("#ndrawer").classList.remove("on"); refreshBell();
  });
  $("#ndrawer").classList.add("on");
}

/* ---------- start ---------- */
if (auth.token) boot(); else { $("#login").classList.remove("hidden"); }
