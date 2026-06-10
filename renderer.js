// ================================
// WATCH KEEPER - renderer.js
// Clean organized rebuild
// ================================

// ---------- Global State ----------
let editingIndex = null;
let editingAssetIndex = null;
let pendingPlannedCrewPackageId = null;
let openQualificationMemberId = null;

let crew = JSON.parse(localStorage.getItem("watchKeeperCrew")) || [];
let assets = JSON.parse(localStorage.getItem("watchKeeperAssets")) || [];
let missionPackages = JSON.parse(localStorage.getItem("watchKeeperMissionPackages")) || [];
let plannedCrews = JSON.parse(localStorage.getItem("watchKeeperPlannedCrews")) || [];
let dutyOverrides = JSON.parse(localStorage.getItem("watchKeeperDutyOverrides")) || {};
let leaveItems =
  JSON.parse(localStorage.getItem("watchKeeperLeaveItems"))
  || [];

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let qualificationFilter = "All";
let workListFilter = "All";

let workItems =
  JSON.parse(localStorage.getItem("watchKeeperWorkItems"))
  || [];

let rotationSettings = JSON.parse(localStorage.getItem("watchKeeperRotationSettings")) || {
  currentSection: "PORT",
  dutyStartDate: new Date().toISOString().slice(0, 10),
  pattern: "2-on-2-off"
};

let smartSettings = JSON.parse(localStorage.getItem("watchKeeperSmartSettings")) || {
  personnelBalance: true,
  personnelWeight: 5,
  qualificationBalance: true,
  qualificationWeight: 8,
  departmentBalance: true,
  departmentWeight: 8,
  leadershipBalance: true,
  leadershipWeight: 5,
  rankBalance: true,
  rankWeight: 5,
  breakInMentorPriority: true,
  breakInWeight: 7,
  philosophy: "Balanced",
  criticalQualWeights: {
    PCX: 10,
    PG: 8,
    OOD: 7,
    ENG: 7,
    BO: 6,
    BTM: 5,
    WCH: 3
  },
  futureLossPrediction: true,
  showRecommendationReasons: true
};

let dashboardSectionView = null;
let dashboardDutyDate = getLocalDateString();
let selectedLeaveDate = getLocalDateString();

// ---------- DOM References ----------
const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");

const topbarButton = document.getElementById("openAddMember");

const modal = document.getElementById("memberModal");
const modalTitle = document.getElementById("modalTitle");
const modalSmartResult = document.getElementById("modalSmartResult");

const assetModal = document.getElementById("assetModal");
const assetModalTitle = document.getElementById("assetModalTitle");

// ---------- Constants ----------
const trackedQuals = ["OOD", "WCH", "PCX", "CX", "PG", "ENG", "BO", "BTM", "CR", "B/I"];
const readinessRequirements = ["OOD", "PCX", "PG", "ENG", "BO", "BTM"];

const rankOrder = [
  "CO", "CDR", "LCDR", "LT", "LTJG", "ENS",
  "CWO4", "CWO3", "CWO2",
  "MCPO", "SCPO", "CPO",
  "PO1", "BM1", "MK1", "ME1", "OS1", "YN1", "SK1", "DC1", "EM1", "ET1", "IT1",
  "PO2", "BM2", "MK2", "ME2", "OS2", "YN2", "SK2", "DC2", "EM2", "ET2", "IT2",
  "PO3", "BM3", "MK3", "ME3", "OS3", "YN3", "SK3", "DC3", "EM3", "ET3", "IT3",
  "SN", "FN", "AN", "SA", "FA", "AA", "SR"
];

// ---------- Save Functions ----------
function saveCrew() {
  localStorage.setItem("watchKeeperCrew", JSON.stringify(crew));
}

function saveAssets() {
  localStorage.setItem("watchKeeperAssets", JSON.stringify(assets));
}

function saveMissionPackages() {
  localStorage.setItem("watchKeeperMissionPackages", JSON.stringify(missionPackages));
}

function savePlannedCrews() {
  localStorage.setItem("watchKeeperPlannedCrews", JSON.stringify(plannedCrews));
}

function saveRotationSettings() {
  localStorage.setItem("watchKeeperRotationSettings", JSON.stringify(rotationSettings));
}

function saveSmartSettings() {
  localStorage.setItem("watchKeeperSmartSettings", JSON.stringify(smartSettings));
}

function saveDutyOverrides() {
  localStorage.setItem("watchKeeperDutyOverrides", JSON.stringify(dutyOverrides));
}

function saveWorkItems() {
  localStorage.setItem(
    "watchKeeperWorkItems",
    JSON.stringify(workItems)
  );
}

function saveLeaveItems() {
  localStorage.setItem(
    "watchKeeperLeaveItems",
    JSON.stringify(leaveItems)
  );
}

// ---------- Basic Helpers ----------
function safeValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function getFullDisplayName(member) {
  if (!member) return "Unnamed Member";

  const rank = member.rank || "";
  const first = member.firstName || "";
  const middle = member.middleInitial ? `${member.middleInitial.replace(".", "")}.` : "";
  const last = member.lastName || "";

  if (last || first || rank) {
    return `${last}, ${first} ${middle} - ${rank}`.replace(/\s+/g, " ").trim();
  }

  return member.name || "Unnamed Member";
}

function getRankValue(rank) {
  const normalized = (rank || "").toUpperCase();
  const index = rankOrder.indexOf(normalized);
  return index === -1 ? 999 : index;
}

function sortMembers(members) {
  return [...members].sort((a, b) => {
    const rankCompare = getRankValue(a.rank) - getRankValue(b.rank);
    if (rankCompare !== 0) return rankCompare;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });
}

function getGroup(sectionName) {
  return sortMembers(crew.filter(member => member.section === sectionName));
}

function getAvailableGroup(sectionName) {
  return sortMembers(crew.filter(member =>
    member.section === sectionName &&
    member.status === "Available"
  ));
}

function countQual(members, qual) {
  return members.filter(member => member.quals && member.quals.includes(qual)).length;
}

function countDept(members, dept) {
  return members.filter(member => member.dept === dept).length;
}

function countLEQualified(members) {
  return members.filter(member =>
    member.quals &&
    (
      member.quals.includes("BTM") ||
      member.quals.includes("BO")
    )
  ).length;
}

function memberHasQual(member, qual) {
  if (!member || !member.quals) return false;

  if (member.quals.includes(qual)) return true;

  if (qual === "CX" && member.quals.includes("PCX")) return true;

  if (
    qual === "CR" &&
    (
      member.quals.includes("ENG") ||
      member.quals.includes("BO") ||
      member.quals.includes("BTM") ||
      member.quals.includes("PG") ||
      member.quals.includes("CX") ||
      member.quals.includes("PCX")
    )
  ) {
    return true;
  }

  return false;
}

function countEffectiveQual(members, qual) {
  return members.filter(member => memberHasQual(member, qual)).length;
}

function isDuplicateMember(rank, firstName, middleInitial, lastName, editingIndexValue = null) {
  const clean = value => (value || "").trim().replace(".", "").toLowerCase();

  return crew.some((member, index) => {
    if (editingIndexValue !== null && index === editingIndexValue) return false;

    return (
      clean(member.rank) === clean(rank) &&
      clean(member.firstName) === clean(firstName) &&
      clean(member.middleInitial) === clean(middleInitial) &&
      clean(member.lastName) === clean(lastName)
    );
  });
}

// ---------- Modal Helpers ----------
function showMemberError(message, focusId = null) {
  if (modalSmartResult) {
    modalSmartResult.classList.remove("hidden");
    modalSmartResult.innerHTML = `<strong>${message}</strong>`;
  }

  setTimeout(() => {
    if (focusId && document.getElementById(focusId)) {
      document.getElementById(focusId).focus();
    }
  }, 100);
}

function clearMemberError() {
  if (modalSmartResult) {
    modalSmartResult.classList.add("hidden");
    modalSmartResult.innerHTML = "";
  }
}

function clearModal() {
  editingIndex = null;
  clearMemberError();

  if (modalTitle) modalTitle.textContent = "Add Member";

  setValue("memberRank", "");
  setValue("memberFirstName", "");
  setValue("memberMiddleInitial", "");
  setValue("memberLastName", "");
  setValue("memberTitle", "None");
  setValue("customTitle", "");
  setValue("memberDept", "Deck");
  setValue("memberSection", "PORT");
  setValue("memberStatus", "Available");
  setValue("customCollateral", "");
  setValue("lossDate", "");
  setValue("lossReason", "None");
  setValue("memberNotes", "");

  document.querySelectorAll(".checks input").forEach(input => {
    input.checked = false;
  });
}

function openMemberModal() {
  clearModal();

  if (!modal) return;

  modal.classList.remove("hidden");

  const modalCard = modal.querySelector(".modal-card");
  if (modalCard) modalCard.scrollTop = 0;

  setTimeout(() => {
    const rankInput = document.getElementById("memberRank");
    if (rankInput) rankInput.focus();
  }, 150);
}

function closeMemberModal() {
  if (modal) modal.classList.add("hidden");
  clearMemberError();
}

function clearAssetModal() {
  editingAssetIndex = null;

  if (assetModalTitle) assetModalTitle.textContent = "Add Asset";

  setValue("assetName", "");
  setValue("assetType", "45 RB-M");
  setValue("assetPursuit", "Yes");
  setValue("assetCrewSize", "4");
  setValue("assetMissionProfile", "SAR");
  setValue("assetStatus", "FMC");
  setValue("assetPmcDescription", "");
  setValue("assetNotes", "");

  hideElement("pmcBox");
}

function openAssetModal() {
  clearAssetModal();

  if (!assetModal) return;

  assetModal.classList.remove("hidden");

  const modalCard = assetModal.querySelector(".modal-card");
  if (modalCard) modalCard.scrollTop = 0;

  setTimeout(() => {
    const nameInput = document.getElementById("assetName");
    if (nameInput) {
      nameInput.disabled = false;
      nameInput.readOnly = false;
      nameInput.focus();
    }
  }, 150);
}

function closeAssetModal() {
  if (assetModal) assetModal.classList.add("hidden");
}

// ---------- Topbar ----------
function updateTopbarButton(page) {
  if (!topbarButton) return;

  if (page === "dashboard") {
    topbarButton.style.display = "block";
    topbarButton.textContent = "+ Add Member";
    topbarButton.onclick = openMemberModal;
  } else if (page === "crew") {
    topbarButton.style.display = "block";
    topbarButton.textContent = "+ Add Member";
    topbarButton.onclick = openMemberModal;

    setTimeout(() => addBatchTopbarButton(), 50);
  }
}

function addBatchTopbarButton() {
  if (document.getElementById("openBatchAdd")) return;

  const button = document.createElement("button");
  button.id = "openBatchAdd";
  button.className = "secondary-btn";
  button.textContent = "Batch Add";
  button.onclick = showBatchAddPanel;

  topbarButton.insertAdjacentElement("afterend", button);
}

window.showBatchAddPanel = function() {
  if (document.getElementById("batchAddPanel")) return;
  content.insertAdjacentHTML("afterbegin", `
    <div class="panel wide" id="batchAddPanel">
      <h3>Batch Add Personnel</h3>

      <p class="member-notes">
        Add multiple personnel quickly. Rank and last name are required.
      </p>

      ${renderBatchAddRows()}

      <div class="dashboard-date-actions">
        <button class="secondary-btn" onclick="addBatchAddRow()">
          Add Row
        </button>

        <button class="primary-btn" onclick="saveBatchPersonnel()">
          Save All
        </button>

        <button class="delete-btn" onclick="document.getElementById('batchAddPanel').remove()">
          Close
        </button>
      </div>
    </div>
  `);
};
// ---------- Rotation ----------
function getCurrentDutySection() {
  return getDutySectionForDate(getLocalDateString());
}

function changeDashboardDutyDate(days) {
  const currentDate = new Date(dashboardDutyDate);
  currentDate.setDate(currentDate.getDate() + days);
  dashboardDutyDate = getLocalDateString(currentDate);
  renderDashboard();
}

function resetDashboardDutyDate() {
  dashboardDutyDate = getLocalDateString();
  renderDashboard();
}

function getDisplayedPlannedCrews() {
  return plannedCrews.filter(plan => plan.dutyDate === dashboardDutyDate);
}

function getPrimarySarCrewForDashboard() {
  const crews = getDisplayedPlannedCrews();

  return crews.find(plan =>
    plan.missionType === "Standby SAR Crew" ||
    plan.missionType === "SAR Crew"
  );
}

function getPlannedCrewsForDate(dateString) {
  return plannedCrews.filter(plan => plan.dutyDate === dateString);
}

function getDutySectionForDate(dateString) {
  if (dutyOverrides[dateString]) {
    return dutyOverrides[dateString];
  }

  const startDate = new Date(rotationSettings.dutyStartDate);
  const targetDate = new Date(dateString);

  startDate.setHours(0,0,0,0);
  targetDate.setHours(0,0,0,0);

  const daysPassed = Math.floor(
    (targetDate - startDate) / (1000 * 60 * 60 * 24)
  );

  const cycleDay = ((daysPassed % 4) + 4) % 4;

  if (cycleDay === 0 || cycleDay === 1) {
    return rotationSettings.currentSection;
  }

  return rotationSettings.currentSection === "PORT"
    ? "STBD"
    : "PORT";
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPrettyDateTime(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  const prettyDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const prettyTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${prettyDate} | ${prettyTime}`;
}

// ---------- Dashboard ----------
function getDashboardQuals(member) {
  const quals = [];

  if (member.quals?.includes("OOD")) quals.push("OOD");

  if (member.quals?.includes("PCX")) {
    quals.push("PCX");
  } else if (member.quals?.includes("CX")) {
    quals.push("CX");
  }

  if (member.quals?.includes("ENG")) quals.push("ENG");
  if (member.quals?.includes("BO")) quals.push("BO");
  if (member.quals?.includes("PG")) quals.push("PG");

  return quals.join(" | ");
}

function getDashboardDisplay(member) {
  const rank = member.rank || "";
  const lastName = member.lastName || "";
  const pieces = [`${rank} ${lastName}`.trim()];

  if (member.title) pieces.push(member.title);

  const trackedQualProblem = getMemberTrackedQuals(member)
    .map(item => getSingleTrackedQualStatus(item))
    .find(status => status.isProblem);

  if (trackedQualProblem) {
    pieces.push(trackedQualProblem.label);
  }

  const quals = getDashboardQuals(member);
  if (quals) pieces.push(quals);

  return pieces.join(" - ");
}

function getMemberIndex(member) {
  return crew.indexOf(member);
}

function getUpcomingLosses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return crew
    .filter(member => member.lossDate && member.lossReason && member.lossReason !== "None")
    .map(member => {
      const lossDate = new Date(member.lossDate);
      const daysUntil = Math.ceil((lossDate - today) / (1000 * 60 * 60 * 24));

      return {
        member,
        lossDate,
        daysUntil
      };
    })
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= 120)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function renderDashboard() {
  const currentDutySection = getDutySectionForDate(dashboardDutyDate);
  const portCrew = getGroup("PORT");
  const stbdCrew = getGroup("STBD");
  const upcomingLosses = getUpcomingLosses();
  const displayedPlannedCrews = getDisplayedPlannedCrews();
  const workSummary = getWorkSummary();
  const topWorkItems = getTopOpenWorkItems();
  const dashboardSarCrew = getPrimarySarCrewForDashboard();
  const leaveSummary = getLeaveSummaryForDashboardDate();
  const leaveConflicts = getPlannedCrewLeaveConflictsForDate(dashboardDutyDate);

  pageTitle.textContent = "Dashboard";
  pageSubtitle.textContent = "Current duty section overview";

  content.innerHTML = `
    <section class="dashboard-grid">
      <div class="panel wide">
        <div class="dashboard-date-card">
          <p class="dashboard-date-label">CURRENT DASHBOARD VIEW</p>

          <h2>${getPrettyDateTime(dashboardDutyDate)}</h2>

          <p>
            <strong>Duty Section:</strong> ${currentDutySection}
            |
            <strong>Rotation:</strong> ${rotationSettings.pattern}
          </p>
        </div>

        <div class="dashboard-date-actions">
          <button class="secondary-btn" onclick="changeDashboardDutyDate(-1)">Previous Day</button>
          <button class="primary-btn" onclick="resetDashboardDutyDate()">Today</button>
          <button class="secondary-btn" onclick="changeDashboardDutyDate(1)">Next Day</button>
        </div>

        <div class="dashboard-date-actions">
          <button class="secondary-btn" onclick="toggleDutyOverrideForDisplayedDate()">
            Swap Duty Section for ${dashboardDutyDate}
          </button>

          ${
            dutyOverrides[dashboardDutyDate]
              ? `
                <button class="secondary-btn" onclick="clearDutyOverrideForDisplayedDate()">
                  Clear Duty Override
                </button>

                <p class="member-notes">
                  Override active for this date.
                </p>
              `
              : ""
          }
        </div>
      </div>

      <div class="card port-card">
        <p>PORT Personnel</p>
        <h3>${portCrew.length}</h3>
      </div>

      <div class="card stbd-card">
        <p>STBD Personnel</p>
        <h3>${stbdCrew.length}</h3>
      </div>

      <div class="duty-sections-row">

        ${["PORT", "STBD"].map(sectionName => {
          const members = getGroup(sectionName);
          const isOnDuty = sectionName === currentDutySection;

          return `
            <div class="panel ${sectionName === "PORT" ? "port-panel" : "stbd-panel"} ${isOnDuty ? "on-duty-panel" : ""}">
              ${isOnDuty ? `<div class="on-duty-label">ON DUTY</div>` : ""}

              <h3>${sectionName} Section Members</h3>

              <ul>
                ${
                  members.length === 0
                    ? `<li class="dashboard-member">No personnel assigned.</li>`
                    : members.map(member => `
                        <li
                          class="dashboard-member clickable-member"
                          onclick="viewPersonnelDetails(${getMemberIndex(member)})"
                        >
                          ${getDashboardDisplay(member)}
                        </li>
                      `).join("")
                }
              </ul>
            </div>
          `;
        }).join("")}

      </div>

      <div class="panel wide ${leaveConflicts.length > 0 ? "not-ready-panel" : "ready-panel"}">
        <h3>Crew Leave Conflict Check</h3>

        ${
          leaveConflicts.length === 0
            ? `<p>No planned crew leave conflicts for this date.</p>`
            : `
              <p><strong>Leave conflicts detected:</strong></p>

              <ul>
                ${leaveConflicts.map(conflict => `
                  <li>
                    ${conflict.plan.missionType}
                    -
                    <strong>${conflict.role}:</strong>
                    ${getFullDisplayName(conflict.member)}
                  </li>
                `).join("")}
              </ul>
            `
        }
      </div>

      <div class="panel wide">
        <h3>Today's SAR Crew</h3>

        ${
          !dashboardSarCrew
            ? `<p class="empty-text">No SAR crew planned for this duty date.</p>`
            : `
              <div class="scenario-summary">
                <h4>${dashboardSarCrew.asset.name}</h4>
                <p>${dashboardSarCrew.asset.type} | ${dashboardSarCrew.asset.status}</p>

                <ul>
                  ${dashboardSarCrew.crew.map(item => {
                    const memberIndex = crew.indexOf(item.member);
                    const onLeave = isMemberOnLeaveForDate(memberIndex, dashboardDutyDate);

                    return `
                      <li>
                        <strong>${item.role}:</strong>
                        ${getFullDisplayName(item.member)}
                        ${
                          onLeave
                            ? `<span class="qual-status qual-overdue">ON LEAVE</span>`
                            : ""
                        }
                      </li>
                    `;
                  }).join("")}
                </ul>

                ${dashboardSarCrew.notes ? `<p class="member-notes">${dashboardSarCrew.notes}</p>` : ""}
              </div>
            `
        }
      </div>

      <div class="panel wide">
        <h3>Planned Crews for ${dashboardDutyDate}</h3>

        ${
          displayedPlannedCrews.length === 0
            ? `<p class="empty-text">No planned crews saved for this duty date.</p>`
            : ["Standby SAR Crew", "Patrol Crew", "Training Crew", "Mission Crew"].map(type => {
                const crewsOfType = displayedPlannedCrews.filter(plan =>
                  plan.missionType === type
                );

                return `
                  <div class="member-card">
                    <h4>${type}</h4>

                    ${
                      crewsOfType.length === 0
                        ? `<p class="empty-text">No ${type.toLowerCase()} planned.</p>`
                        : crewsOfType.map(plan => `
                            <div class="scenario-summary">
                              <h4>${plan.asset.name}</h4>

                              <p>${plan.asset.type} | ${plan.asset.status}</p>

                              <ul>
                                ${plan.crew.map(item => {
                                  const memberIndex = crew.indexOf(item.member);
                                  const onLeave = isMemberOnLeaveForDate(memberIndex, dashboardDutyDate);

                                  return `
                                    <li>
                                      <strong>${item.role}:</strong>
                                      ${getFullDisplayName(item.member)}
                                      ${
                                        onLeave
                                          ? `<span class="qual-status qual-overdue">ON LEAVE</span>`
                                          : ""
                                      }
                                    </li>
                                  `;
                                }).join("")}
                              </ul>

                              ${plan.notes ? `<p class="member-notes">${plan.notes}</p>` : ""}

                              <button class="action-btn delete-btn" onclick="deletePlannedCrew(${plan.id})">
                                Delete Planned Crew
                              </button>
                            </div>
                          `).join("")
                    }
                  </div>
                `;
              }).join("")
        }
      </div>

      <div class="panel wide">
        <h3>Work List Summary</h3>

        <div class="cards">
          <div class="card">
            <p>Open</p>
            <h3>${workSummary.open}</h3>
          </div>

          <div class="card ready">
            <p>Completed</p>
            <h3>${workSummary.completed}</h3>
          </div>

          <div class="card not-ready-panel">
            <p>Overdue</p>
            <h3>${workSummary.overdue}</h3>
          </div>
        </div>

        <h4>Top Open Work Items</h4>

        ${
          topWorkItems.length === 0
            ? `<p class="empty-text">No open work items.</p>`
            : `
              <ul>
                ${topWorkItems.map(item => `
                  <li>
                    <strong>${item.title}</strong>
                    - ${item.category}
                    ${item.dueDate ? ` | Due: ${item.dueDate}` : ""}
                  </li>
                `).join("")}
              </ul>
            `
        }
      </div>

      <div class="panel wide">
        <h3>Leave / TDY for ${dashboardDutyDate}</h3>

        ${
          leaveSummary.total === 0
            ? `<p class="empty-text">No leave, TDY, school, or medical entries for this date.</p>`
            : `
              <ul>
                ${leaveSummary.items.map(item => {
                  const member = crew[item.memberIndex];

                  return `
                    <li>
                      ${renderLeaveImpact(item)}
                      <strong>${member ? getFullDisplayName(member) : "Unknown Member"}</strong>
                      - ${item.leaveType}
                      (${item.startDate} to ${item.endDate})
                    </li>
                  `;
                }).join("")}
              </ul>
            `
        }
      </div>

      <div class="panel wide">
        <h3>Future Loss Warnings</h3>

        ${
          upcomingLosses.length === 0
            ? `<p class="empty-text">No projected personnel losses within the next 120 days.</p>`
            : `
              <ul>
                ${upcomingLosses.map(item => `
                  <li
                    class="dashboard-member clickable-member"
                    onclick="viewPersonnelDetails(${getMemberIndex(item.member)})"
                  >
                    ${getFullDisplayName(item.member)}
                    - ${item.member.lossReason}
                    in ${item.daysUntil} days
                    (${item.member.lossDate})
                    <br>
                    <span class="member-notes">
                      Impact: Loss of ${(item.member.quals || []).join(", ") || "no listed qualifications"}
                      from ${item.member.section}.
                    </span>
                  </li>
                `).join("")}
              </ul>
            `
        }
      </div>
    </section>
  `;
}

function renderCalendar() {

  pageTitle.textContent = "Duty Calendar";
  pageSubtitle.textContent = "Monthly duty schedule";

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);

  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthName = firstDay.toLocaleString("default", {
    month: "long"
  });

  let cells = "";

  for (let i = 0; i < startWeekday; i++) {
    cells += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {

    const date = new Date(calendarYear, calendarMonth, day);

    const dateString =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    const section = getDutySectionForDate(dateString);
    const hasOverride = !!dutyOverrides[dateString];
    const plannedForDay = getPlannedCrewsForDate(dateString);

    cells += `
      <div
        class="calendar-cell ${section === "PORT" ? "port-day" : "stbd-day"} ${hasOverride ? "override-day" : ""}"
        onclick="selectCalendarDate('${dateString}')"
      >
        <strong>${day}</strong>

        <div class="calendar-duty">
          ${section}
        </div>

        ${
          hasOverride
            ? `<div class="calendar-override">OVERRIDE</div>`
            : ""
        }

        <div class="calendar-crews">

          ${
            plannedForDay.length === 0
              ? `<span>No Crews</span>`
              : plannedForDay
                  .slice(0, 2)
                  .map(plan => `
                    <div class="calendar-crew-tag">
                      ${plan.missionType.replace(" Crew","")}
                    </div>
                  `)
                  .join("")
          }

          ${
            plannedForDay.length > 2
              ? `<div class="calendar-more">
                  +${plannedForDay.length - 2} more
                </div>`
              : ""
          }

        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="panel">

      <div class="calendar-header">

        <button
          class="secondary-btn"
          onclick="changeCalendarMonth(-1)"
        >
          Previous
        </button>

        <h3>
          ${monthName} ${calendarYear}
        </h3>

        <button
          class="secondary-btn"
          onclick="changeCalendarMonth(1)"
        >
          Next
        </button>

      </div>

      <div class="calendar-grid">

        <div class="calendar-weekday">Sun</div>
        <div class="calendar-weekday">Mon</div>
        <div class="calendar-weekday">Tue</div>
        <div class="calendar-weekday">Wed</div>
        <div class="calendar-weekday">Thu</div>
        <div class="calendar-weekday">Fri</div>
        <div class="calendar-weekday">Sat</div>

        ${cells}

      </div>

    </div>
  `;
}

window.toggleDutyOverrideForDisplayedDate = function() {
  const currentSection = getDutySectionForDate(dashboardDutyDate);
  const newSection = currentSection === "PORT" ? "STBD" : "PORT";

  dutyOverrides[dashboardDutyDate] = newSection;
  saveDutyOverrides();

  dashboardSectionView = newSection;
  renderDashboard();
};

window.clearDutyOverrideForDisplayedDate = function() {
  delete dutyOverrides[dashboardDutyDate];
  saveDutyOverrides();

  dashboardSectionView = getDutySectionForDate(dashboardDutyDate);
  renderDashboard();
};

window.changeCalendarMonth = function(direction) {

  calendarMonth += direction;

  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }

  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }

  renderCalendar();
};

window.selectCalendarDate = function(dateString) {

  dashboardDutyDate = dateString;

  document
    .querySelector('[data-page="dashboard"]')
    ?.click();
};

window.toggleDashboardDutySection = function() {
  dashboardSectionView = dashboardSectionView === "PORT" ? "STBD" : "PORT";
  renderDashboard();
};

window.deletePlannedCrew = function(id) {
  plannedCrews = plannedCrews.filter(plan => plan.id !== id);
  savePlannedCrews();
  renderDashboard();
};

// ---------- Crew Roster ----------
function getSelectedModalQuals() {
  let quals = [...document.querySelectorAll(".checks input:checked")]
    .filter(input => trackedQuals.includes(input.value))
    .map(input => input.value);

  if (quals.includes("PCX")) {
    quals = quals.filter(q => q !== "CX");
  }

  return quals;
}

function getSelectedModalCollaterals() {
  const selected = [...document.querySelectorAll(".checks input:checked")]
    .filter(input => !trackedQuals.includes(input.value))
    .map(input => input.value);

  const customCollateral = safeValue("customCollateral").trim();

  if (selected.includes("Custom") && customCollateral) {
    return selected.filter(item => item !== "Custom").concat(customCollateral);
  }

  return selected.filter(item => item !== "Custom");
}

function getMemberTitle() {
  const title = safeValue("memberTitle", "None");
  const customTitle = safeValue("customTitle").trim();

  if (title === "Custom") return customTitle;
  if (title === "None") return "";

  return title;
}

function renderBatchAddRows() {
  return `
    <div id="batchAddRows">
      ${renderBatchAddRow()}
    </div>
  `;
}

function renderBatchAddRow() {
  return `
    <div class="batch-add-row">
      <input class="batch-rank" placeholder="Rank">

      <input class="batch-first" placeholder="First">

      <input class="batch-mi" placeholder="MI">

      <input class="batch-last" placeholder="Last">

      <select class="batch-section">
        <option>PORT</option>
        <option>STBD</option>
        <option>Day Worker</option>
        <option>Reservist</option>
        <option>TDY to Station</option>
      </select>

      <select class="batch-dept">
        <option>Deck</option>
        <option>Engineering</option>
        <option>Law Enforcement</option>
        <option>Command</option>
        <option>Galley</option>
        <option>Other</option>
      </select>

      <button class="delete-btn" onclick="this.closest('.batch-add-row').remove()">
        Remove
      </button>
    </div>
  `;
}

function renderCrewRoster() {
  pageTitle.textContent = "Crew Roster";
  pageSubtitle.textContent = "Personnel grouped by section and sorted by rank";

  const groups = [
    { title: "PORT Section", value: "PORT", className: "port-panel" },
    { title: "STBD Section", value: "STBD", className: "stbd-panel" },
    { title: "Day Workers", value: "Day Worker", className: "" },
    { title: "Reservists", value: "Reservist", className: "" },
    { title: "TDY to Station", value: "TDY to Station", className: "" }
  ];

  content.innerHTML = `

    <section class="roster-grid">
      ${groups.map(group => {
        const members = getGroup(group.value);

        return `
          <div class="panel roster-panel ${group.className}">
            <h3>${group.title}</h3>

            ${
              members.length === 0
                ? `<p class="empty-text">No personnel assigned.</p>`
                : members.map(member => {
                    const index = crew.indexOf(member);

                    return `
                      <div class="member-card">
                        <div class="member-header">
                          <div>
                            <h4>${getFullDisplayName(member)}</h4>
                            ${member.title ? `<p class="member-title">${member.title}</p>` : ""}
                            <p>${member.dept} | ${member.status}</p>
                          </div>

                          <div class="member-actions">
                            <button class="action-btn" onclick="viewPersonnelDetails(${index})">Details</button>
                            <button class="action-btn" onclick="editMember(${index})">Edit</button>
                            <button class="action-btn delete-btn" onclick="deleteMember(${index})">Delete</button>
                          </div>
                        </div>

                        <div class="qual-row">
                          ${(member.quals || []).map(qual => `<span class="badge">${qual}</span>`).join("")}
                        </div>

                        ${
                          member.collaterals && member.collaterals.length > 0
                            ? `<div class="qual-row">
                                ${member.collaterals.map(c => `<span class="badge collateral-badge">${c}</span>`).join("")}
                              </div>`
                            : ""
                        }

                        ${
                          member.lossDate && member.lossReason && member.lossReason !== "None"
                            ? `<p class="member-notes"><strong>Projected Loss:</strong> ${member.lossReason} on ${member.lossDate}</p>`
                            : ""
                        }

                        ${member.notes ? `<p class="member-notes">${member.notes}</p>` : ""}
                      </div>
                    `;
                  }).join("")
            }
          </div>
        `;
      }).join("")}
    </section>
  `;
}

window.addPersonnelNote = function(index) {

  const member = crew[index];
  if (!member) return;

  const noteText =
    document.getElementById("newPersonnelNote").value.trim();

  const noteCategory =
    document.getElementById("noteCategory").value;

  if (!noteText) return;

  if (!member.notesHistory) {
    member.notesHistory = [];
  }

  member.notesHistory.unshift({
    category: noteCategory,
    text: noteText,
    timestamp: new Date().toLocaleString()
  });

  saveCrew();

  viewPersonnelDetails(index);
};

window.addBatchAddRow = function() {
  const container = document.getElementById("batchAddRows");

  if (!container) return;

  container.insertAdjacentHTML("beforeend", renderBatchAddRow());
};

window.saveBatchPersonnel = function() {
  const rows = [...document.querySelectorAll(".batch-add-row")];

  let addedCount = 0;
  let skippedCount = 0;

  rows.forEach(row => {
    const rank = row.querySelector(".batch-rank").value.trim();
    const firstName = row.querySelector(".batch-first").value.trim();
    const middleInitial = row.querySelector(".batch-mi").value.trim().replace(".", "");
    const lastName = row.querySelector(".batch-last").value.trim();
    const section = row.querySelector(".batch-section").value;
    const dept = row.querySelector(".batch-dept").value;

    if (!rank || !lastName) {
      skippedCount++;
      return;
    }

    if (isDuplicateMember(rank, firstName, middleInitial, lastName, null)) {
      skippedCount++;
      return;
    }

    crew.push({
      rank,
      firstName,
      middleInitial,
      lastName,
      title: "",
      dept,
      section,
      status: "Available",
      quals: [],
      collaterals: [],
      lossDate: "",
      lossReason: "None",
      notes: "",
      notesHistory: [],
      trackQualifications: false,
      trackedQuals: []
    });

    addedCount++;
  });

  saveCrew();
  renderCrewRoster();

  alert(`Batch add complete. Added: ${addedCount}. Skipped: ${skippedCount}.`);
};

window.viewPersonnelDetails = function(index) {
  const member = crew[index];

  if (!member) return;

  pageTitle.textContent = "Personnel Details";
  pageSubtitle.textContent = getFullDisplayName(member);

  content.innerHTML = `
    <section class="dashboard-grid">

      <div class="panel wide">
        <h3>${getFullDisplayName(member)}</h3>

        <p><strong>Department:</strong> ${member.dept || "Not listed"}</p>
        <p><strong>Section:</strong> ${member.section || "Not listed"}</p>
        <p><strong>Status:</strong> ${member.status || "Not listed"}</p>
        <p><strong>Title:</strong> ${member.title || "None"}</p>
        <p><strong>EMPLID:</strong> ${member.emplid || "Not listed"}</p>
        <p><strong>Expected Arrival / Start Date:</strong> ${member.arrivalDate || "Not listed"}</p>
        <p><strong>Expected Section Swap Date:</strong> ${member.swapDate || "Not listed"}</p>
      </div>

      <div class="panel">
        <h3>Qualifications</h3>

        <div class="qual-row">
          ${
            member.quals && member.quals.length > 0
              ? member.quals.map(qual => `<span class="badge">${qual}</span>`).join("")
              : `<p class="empty-text">No qualifications listed.</p>`
          }
        </div>

        <h4>Tracked Break-Ins</h4>

        ${
          member.trackedQuals && member.trackedQuals.length > 0
            ? member.trackedQuals.map(item => {
                const status = getSingleTrackedQualStatus(item);

                return `
                  <div class="member-card">
                    <h4>${item.qual}</h4>

                    <p class="${status.className}">
                      ${status.label}
                    </p>

                    <p>
                      <strong>Due Date:</strong>
                      ${item.dueDate || "No date listed"}
                    </p>
                  </div>
                `;
              }).join("")
            : `<p class="empty-text">No tracked break-ins.</p>`
        }

        ${
          member.trackQualifications
            ? `
              <button class="secondary-btn" onclick="removeMemberFromQualificationTracking(${index})">
                Remove from Qualification Tracking
              </button>
            `
            : `
              <button class="primary-btn" onclick="addMemberToQualificationTracking(${index})">
                Add to Qualification Tracking
              </button>
            `
        }
      </div>

        <h4>Qualification Due Dates</h4>

        ${
          ["OOD", "WCH", "PCX", "CX", "ENG", "BTM", "CR"].map(qual => {
            const dueDate = member.qualDueDates?.[qual];
            const status = getQualDueStatus(dueDate);

            return `
              <div class="qual-date-row">
                <strong>${qual}</strong>

                <span>${dueDate || "No date listed"}</span>

                <span class="qual-status ${status.className}">
                  ${status.label}
                </span>
              </div>
            `;
          }).join("")
        }

        ${
          member.qualificationStatus
            ? `
              <p>
                <strong>Qualification Status:</strong>
                <span class="qual-status qual-warning">
                  ${member.qualificationStatus}
                </span>
              </p>
            `
            : ""
        }
      </div>

      <div class="panel">
        <h3>Collaterals</h3>

        <div class="qual-row">
          ${
            member.collaterals && member.collaterals.length > 0
              ? member.collaterals.map(item => `<span class="badge collateral-badge">${item}</span>`).join("")
              : `<p class="empty-text">No collaterals listed.</p>`
          }
        </div>
      </div>

      <div class="panel wide">

        <h3>Personnel Notes</h3>

        <p>${member.notes || "No notes entered."}</p>

        <hr>

        <label>Note Category</label>

        <select id="noteCategory">
          <option>Admin</option>
          <option>Training</option>
          <option>Qualification</option>
          <option>Discipline</option>
          <option>General</option>
        </select>

        <label>New Note</label>

        <textarea
          id="newPersonnelNote"
          placeholder="Enter note..."
        ></textarea>

        <button
          class="primary-btn"
          onclick="addPersonnelNote(${index})"
        >
          Add Note
        </button>

      </div>

      <div class="panel wide">

        <h3>History Log</h3>

        ${
          member.notesHistory &&
          member.notesHistory.length > 0

            ? member.notesHistory.map(note => `
                <div class="member-card">

                  <p>
                    <strong>${note.category}</strong>
                  </p>

                  <p>${note.text}</p>

                  <p class="member-notes">
                    ${note.timestamp}
                  </p>

                </div>
              `).join("")

            : `<p>No history entries.</p>`
        }

      </div>

      <div class="panel wide">
        <h3>Projected Personnel Movement</h3>

        <p><strong>Projected Loss Reason:</strong> ${member.lossReason || "None"}</p>
        <p><strong>Projected Loss Date:</strong> ${member.lossDate || "Not listed"}</p>
      </div>

      ${
        member.trackQualifications
          ? `
            <button class="secondary-btn" onclick="removeMemberFromQualificationTracking(${index})">
              Remove from Qualification Tracking
            </button>
          `
          : `
            <button class="primary-btn" onclick="addMemberToQualificationTracking(${index})">
              Add to Qualification Tracking
            </button>
          `
      }

      <div class="panel wide">
        <button class="primary-btn" onclick="editMember(${index})">
          Edit Personnel
        </button>

        <button class="secondary-btn" onclick="renderCrewRoster()">
          Back to Crew Roster
        </button>
      </div>

    </section>
  `;
};

window.editMember = function(index) {
  editingIndex = index;
  const member = crew[index];

  clearModal();

  editingIndex = index;
  modalTitle.textContent = "Edit Member";

  setValue("memberRank", member.rank || "");
  setValue("memberFirstName", member.firstName || "");
  setValue("memberMiddleInitial", member.middleInitial || "");
  setValue("memberLastName", member.lastName || "");
  setValue("memberTitle", member.title || "None");
  setValue("customTitle", "");
  setValue("memberDept", member.dept || "Deck");
  setValue("memberSection", member.section || "PORT");
  setValue("memberStatus", member.status || "Available");
  setValue("lossDate", member.lossDate || "");
  setValue("lossReason", member.lossReason || "None");
  setValue("memberEmplid", member.emplid || "");
  setValue("memberArrivalDate", member.arrivalDate || "");
  setValue("memberSwapDate", member.swapDate || "");
  setValue("memberNotes", member.notes || "");

  document.querySelectorAll(".checks input").forEach(input => {
    input.checked = false;
  });

  (member.quals || []).forEach(qual => {
    const box = [...document.querySelectorAll(".checks input")].find(input => input.value === qual);
    if (box) box.checked = true;
  });

  (member.collaterals || []).forEach(collateral => {
    const box = [...document.querySelectorAll(".checks input")].find(input => input.value === collateral);
    if (box) {
      box.checked = true;
    } else {
      const customBox = [...document.querySelectorAll(".checks input")].find(input => input.value === "Custom");
      if (customBox) customBox.checked = true;
      setValue("customCollateral", collateral);
    }
  });

  modal.classList.remove("hidden");

  const modalCard = modal.querySelector(".modal-card");
  if (modalCard) modalCard.scrollTop = 0;

  setTimeout(() => {
    const rankInput = document.getElementById("memberRank");
    if (rankInput) rankInput.focus();
  }, 150);
};

window.deleteMember = function(index) {
  crew.splice(index, 1);
  saveCrew();
  renderCrewRoster();
};

// ---------- Worklist ----------

function renderWorkList() {
  pageTitle.textContent = "Work List";
  pageSubtitle.textContent = "Maintenance, repairs, cleanups, and station task tracking";

  content.innerHTML = `
    <section class="dashboard-grid">

      <div class="panel wide">
        <h3>Add Work Item</h3>

        <label>Task</label>
        <input id="workTitle" placeholder="Example: Replace 45631 nav light">

        <label>Category</label>
        <select id="workCategory">
          <option>Engineering - Maintenance</option>
          <option>Engineering - Repairs</option>
          <option>Deck - Maintenance</option>
          <option>Deck - Repairs</option>
          <option>Facilities - Maintenance</option>
          <option>Facilities - Repairs</option>
          <option>Lawn Maintenance</option>
          <option>Cleanups</option>
          <option>Requested To-Do List</option>
          <option>Miscellaneous</option>
        </select>

        <label>Assigned To</label>
        <input id="workAssigned" placeholder="Optional">

        <label>Due Date</label>
        <input id="workDueDate" type="date">

        <label>Notes</label>
        <textarea id="workNotes" placeholder="Optional details..."></textarea>

        <button class="primary-btn" onclick="addWorkItem()">
          Add Work Item
        </button>
      </div>

      <div class="panel wide">
        <h3>Filter</h3>

        <div class="dashboard-date-actions">
          <button class="${workListFilter === "All" ? "primary-btn" : "secondary-btn"}" onclick="setWorkListFilter('All')">
            All
          </button>

          <button class="${workListFilter === "Open" ? "primary-btn" : "secondary-btn"}" onclick="setWorkListFilter('Open')">
            Open
          </button>

          <button class="${workListFilter === "Completed" ? "primary-btn" : "secondary-btn"}" onclick="setWorkListFilter('Completed')">
            Completed
          </button>

          <button class="${workListFilter === "Overdue" ? "primary-btn" : "secondary-btn"}" onclick="setWorkListFilter('Overdue')">
            Overdue
          </button>
        </div>
      </div>

      ${renderWorkSection("Engineering", ["Engineering - Maintenance", "Engineering - Repairs"])}
      ${renderWorkSection("Deck", ["Deck - Maintenance", "Deck - Repairs"])}
      ${renderWorkSection("Facilities", ["Facilities - Maintenance", "Facilities - Repairs"])}

      ${renderSingleWorkCategory("Lawn Maintenance")}
      ${renderSingleWorkCategory("Cleanups")}
      ${renderSingleWorkCategory("Requested To-Do List")}
      ${renderSingleWorkCategory("Miscellaneous")}

      <div class="panel wide">
        <button class="delete-btn" onclick="deleteSelectedWorkItems()">
          Delete Selected Tasks
        </button>
      </div>

      <button class="delete-btn" onclick="deleteCompletedWorkItems()">
        Delete All Completed Tasks
      </button>

    </section>
  `;
}

function getWorkSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const open = workItems.filter(item => !item.completed).length;
  const completed = workItems.filter(item => item.completed).length;

  const overdue = workItems.filter(item => {
    if (item.completed || !item.dueDate) return false;

    const due = new Date(item.dueDate);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }).length;

  return { open, completed, overdue };
}

function getTopOpenWorkItems(limit = 5) {
  return workItems
    .filter(item => !item.completed)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, limit);
}

function renderWorkSection(title, categories) {
  return `
    <div class="panel wide">
      <h3>${title}</h3>

      ${categories.map(category => `
        <div class="member-card">
          <h4>${category.replace(`${title} - `, "")}</h4>
          ${renderWorkItemsForCategory(category)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderSingleWorkCategory(category) {
  return `
    <div class="panel wide">
      <h3>${category}</h3>
      ${renderWorkItemsForCategory(category)}
    </div>
  `;
}

function renderWorkItemsForCategory(category) {
  const items = workItems.filter(item =>
    item.category === category &&
    workItemMatchesFilter(item)
  );
  if (items.length === 0) {
    return `<p class="empty-text">No tasks.</p>`;
  }

  return items.map(item => `
    <div class="work-item ${item.completed ? "work-completed" : ""}">

      <div class="work-row">

        <input
          type="checkbox"
          ${item.completed ? "checked" : ""}
          onchange="toggleWorkComplete(${item.id})"
        >

        <span class="work-task-title">
          ${item.title}
          ${item.completed ? `<span class="qual-status qual-current">DONE</span>` : ""}
        </span>

        <span class="work-assigned">
          Assigned: ${item.assigned || "Unassigned"}
        </span>

        <span class="work-due">
          ${item.dueDate ? `Due: ${item.dueDate}` : "No Due Date"}
        </span>

        <label class="work-delete">
          <input
            type="checkbox"
            class="work-delete-check"
            value="${item.id}"
          >
          Delete
        </label>

      </div>

      ${
        item.notes
          ? `<div class="work-notes">${item.notes}</div>`
          : ""
      }

    </div>
  `).join("");
}

window.deleteCompletedWorkItems = function() {
  workItems = workItems.filter(item => !item.completed);
  saveWorkItems();
  renderWorkList();
};

window.addWorkItem = function() {
  const title = document.getElementById("workTitle").value.trim();

  if (!title) {
    document.getElementById("workTitle").focus();
    return;
  }

  workItems.push({
    id: Date.now(),
    title,
    category: document.getElementById("workCategory").value,
    assigned: document.getElementById("workAssigned").value.trim(),
    dueDate: document.getElementById("workDueDate").value,
    notes: document.getElementById("workNotes").value.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveWorkItems();
  renderWorkList();
};

window.toggleWorkComplete = function(id) {
  const item = workItems.find(item => item.id === id);

  if (!item) return;

  item.completed = !item.completed;
  saveWorkItems();
  renderWorkList();
};

window.deleteSelectedWorkItems = function() {
  const selectedIds = [...document.querySelectorAll(".work-delete-check:checked")]
    .map(input => Number(input.value));

  if (selectedIds.length === 0) return;

  workItems = workItems.filter(item => !selectedIds.includes(item.id));
  saveWorkItems();
  renderWorkList();
};

function isWorkItemOverdue(item) {
  if (item.completed || !item.dueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(item.dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

function workItemMatchesFilter(item) {
  if (workListFilter === "All") return true;
  if (workListFilter === "Open") return !item.completed;
  if (workListFilter === "Completed") return item.completed;
  if (workListFilter === "Overdue") return isWorkItemOverdue(item);

  return true;
}

window.setWorkListFilter = function(filter) {
  workListFilter = filter;
  renderWorkList();
};

// ---------- Duty Sections ----------
function renderDutySections() {
  const portCrew = getGroup("PORT");
  const stbdCrew = getGroup("STBD");
  const dayWorkers = getGroup("Day Worker");

  pageTitle.textContent = "Duty Sections";
  pageSubtitle.textContent = "PORT, STBD, and Day Worker staffing overview";

  content.innerHTML = `
    <section class="dashboard-grid">
      ${renderSectionAnalysisPanel("PORT Section", portCrew, "port-panel")}
      ${renderSectionAnalysisPanel("STBD Section", stbdCrew, "stbd-panel")}

      <div class="panel wide">
        <h3>Watch Keeper Notes</h3>
        <ul>
          ${generateSectionRecommendations(portCrew, stbdCrew).map(note => `<li>${note}</li>`).join("")}
        </ul>
      </div>

      <div class="panel wide">
        ${renderSectionAnalysisPanel("Day Workers", dayWorkers, "")}
      </div>
    </section>
  `;
}

function renderSectionAnalysisPanel(title, members, extraClass) {
  return `
    <div class="section-analysis ${extraClass}">
      <h3>${title}</h3>

      <div class="section-topline">
        <div>
          <p>Total Personnel</p>
          <h2>${members.length}</h2>
        </div>

        <div>
          <p>LE Qualified</p>
          <h2>${countLEQualified(members)}</h2>
        </div>
      </div>

      <div class="section-analysis-grid">
        <div>
          <h4>Qualification Staffing</h4>
          <ul>
            ${trackedQuals.map(qual => `<li>${qual}: ${countQual(members, qual)}</li>`).join("")}
          </ul>
        </div>

        <div>
          <h4>Department Staffing</h4>
          <ul>
            <li>Deck: ${countDept(members, "Deck")}</li>
            <li>Engineering: ${countDept(members, "Engineering")}</li>
            <li>LE Qualified: ${countLEQualified(members)}</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function generateSectionRecommendations(portCrew, stbdCrew) {
  const notes = [];

  if (Math.abs(portCrew.length - stbdCrew.length) > 1) {
    const smaller = portCrew.length < stbdCrew.length ? "PORT" : "STBD";
    notes.push(`${smaller} has fewer assigned personnel. Consider assigning the next reporting member to ${smaller}.`);
  } else {
    notes.push("PORT and STBD are balanced by total personnel count.");
  }

  trackedQuals.forEach(qual => {
    const portCount = countQual(portCrew, qual);
    const stbdCount = countQual(stbdCrew, qual);

    if (Math.abs(portCount - stbdCount) >= 2) {
      const weaker = portCount < stbdCount ? "PORT" : "STBD";
      notes.push(`${qual} is uneven. ${weaker} has fewer ${qual}-qualified members.`);
    }

    if (portCount === 0 && stbdCount > 0) notes.push(`PORT has no ${qual}-qualified members.`);
    if (stbdCount === 0 && portCount > 0) notes.push(`STBD has no ${qual}-qualified members.`);
  });

  return notes;
}

// ---------- Readiness ----------
function checkReadiness(sectionName) {
  const members = getAvailableGroup(sectionName);
  const missing = [];

  readinessRequirements.forEach(req => {
    if (countEffectiveQual(members, req) < 1) {
      missing.push(req);
    }
  });

  return {
    section: sectionName,
    ready: missing.length === 0,
    missing,
    members
  };
}

function getDayWorkerStandbyOptions(requiredQual) {
  const dayWorkers = getGroup("Day Worker").filter(member => member.status === "Available");
  return dayWorkers.filter(member => memberHasQual(member, requiredQual));
}

function renderReadinessCheck() {
  const port = checkReadiness("PORT");
  const stbd = checkReadiness("STBD");

  pageTitle.textContent = "Readiness Check";
  pageSubtitle.textContent = "Check section readiness and Day Worker standby options";

  content.innerHTML = `
    <section class="dashboard-grid">
      ${renderReadinessPanel(port)}
      ${renderReadinessPanel(stbd)}

      <div class="panel wide">
        <h3>Minimum Duty Requirements</h3>
        <div class="qual-row">
          ${readinessRequirements.map(req => `<span class="badge">${req}</span>`).join("")}
        </div>

        <p class="member-notes">
          Day Workers do not count toward normal PORT/STBD readiness. They are only shown as standby options when a section is missing a required qualification.
        </p>
      </div>
    </section>
  `;
}

function renderReadinessPanel(result) {
  return `
    <div class="panel readiness-panel ${result.ready ? "ready-panel" : "not-ready-panel"}">
      <h3>${result.section} Section</h3>
      <h2>${result.ready ? "MISSION CAPABLE" : "NOT MISSION CAPABLE"}</h2>
      <p>Available Section Personnel: ${result.members.length}</p>

      ${
        result.ready
          ? `<p>No missing minimum qualifications.</p>`
          : `
            <h4>Missing Required Qualifications</h4>

            <div class="qual-row">
              ${result.missing.map(req => `<span class="badge missing-badge">${req}</span>`).join("")}
            </div>

            <h4>Recommended Day Worker Standby Coverage</h4>

            <div class="standby-list">
              ${
                result.missing.map(req => {
                  const options = getDayWorkerStandbyOptions(req);

                  if (options.length === 0) {
                    return `
                      <div class="standby-card no-standby">
                        <strong>${req}</strong>
                        <p>No available Day Worker found.</p>
                      </div>
                    `;
                  }

                  return `
                    <div class="standby-card">
                      <strong>${req}</strong>
                      <p>${options.map(member => getFullDisplayName(member)).join(", ")}</p>
                    </div>
                  `;
                }).join("")
              }
            </div>
          `
      }

      <h4>Available Section Members</h4>

      <ul>
        ${
          result.members.length === 0
            ? "<li>No available members.</li>"
            : result.members.map(member => `<li>${getFullDisplayName(member)} - ${(member.quals || []).join(", ")}</li>`).join("")
        }
      </ul>
    </div>
  `;
}

// ---------- Smart Assignment ----------
function recommendSectionForNewMember(dept, quals) {
  const port = getGroup("PORT");
  const stbd = getGroup("STBD");

  let portScore = 0;
  let stbdScore = 0;

  const portReasons = [];
  const stbdReasons = [];

  if (port.length < stbd.length) {
    portScore += smartSettings.personnelWeight;
    portReasons.push("PORT currently has fewer total personnel.");
  } else if (stbd.length < port.length) {
    stbdScore += smartSettings.personnelWeight;
    stbdReasons.push("STBD currently has fewer total personnel.");
  }

  const portDept = countDept(port, dept);
  const stbdDept = countDept(stbd, dept);

  if (portDept < stbdDept) {
    portScore += smartSettings.departmentWeight;
    portReasons.push(`PORT currently has fewer ${dept} personnel.`);
  } else if (stbdDept < portDept) {
    stbdScore += smartSettings.departmentWeight;
    stbdReasons.push(`STBD currently has fewer ${dept} personnel.`);
  }

  quals.forEach(qual => {
    const portQual = countQual(port, qual);
    const stbdQual = countQual(stbd, qual);
    const weight = smartSettings.criticalQualWeights[qual] || smartSettings.qualificationWeight;

    if (portQual < stbdQual) {
      portScore += weight;
      portReasons.push(`PORT currently has fewer ${qual}-qualified members.`);
    } else if (stbdQual < portQual) {
      stbdScore += weight;
      stbdReasons.push(`STBD currently has fewer ${qual}-qualified members.`);
    }
  });

  const recommendation = portScore >= stbdScore ? "PORT" : "STBD";
  const reasons = recommendation === "PORT" ? portReasons : stbdReasons;

  if (reasons.length === 0) {
    reasons.push(`${recommendation} selected as the default because no major imbalance was detected.`);
  }

  return {
    recommendation,
    portScore,
    stbdScore,
    reasons
  };
}

function runModalSmartAssignment() {
  const dept = safeValue("memberDept", "Deck");
  const quals = getSelectedModalQuals();

  const result = recommendSectionForNewMember(dept, quals);

  setValue("memberSection", result.recommendation);

  modalSmartResult.classList.remove("hidden");
  modalSmartResult.innerHTML = `
    <strong>Recommended Assignment: ${result.recommendation}</strong>

    ${
      smartSettings.showRecommendationReasons !== false
        ? `
          <h4>Reason</h4>
          <ul>
            ${result.reasons.map(reason => `<li>${reason}</li>`).join("")}
          </ul>
        `
        : ""
    }

    <p class="member-notes">
      Recommendation is based on the current Smart Assignment mode: ${smartSettings.philosophy}.
    </p>
  `;
}

function getSmartModeDescription(mode) {
  if (mode === "Balanced") {
    return "Balanced mode keeps PORT and STBD generally even across personnel, departments, and qualifications.";
  }

  if (mode === "Readiness Focused") {
    return "Readiness Focused mode prioritizes operational qualifications like PCX, PG, OOD, ENG, BO, and BTM.";
  }

  if (mode === "Training Focused") {
    return "Training Focused mode places break-ins where stronger qualified mentors exist.";
  }

  if (mode === "Leadership Focused") {
    return "Leadership Focused mode tries to evenly distribute station leadership, senior members, and section leaders.";
  }

  if (mode === "Custom") {
    return "Custom mode allows advanced users to manually adjust the Smart Assignment scoring weights.";
  }

  return "";
}

function renderSmartSettingToggle(toggleKey, weightKey, label) {
  return `
    <div class="smart-setting-row">
      <label class="setting-check">
        <input type="checkbox" id="${toggleKey}" ${smartSettings[toggleKey] ? "checked" : ""}>
        ${label}
      </label>

      <input type="number" min="0" max="10" id="${weightKey}" value="${smartSettings[weightKey]}">
    </div>
  `;
}

function renderSmartAssignmentSettings() {
  pageTitle.textContent = "Smart Assignment Settings";
  pageSubtitle.textContent = "Choose how Watch Keeper recommends PORT and STBD assignments";

  const isCustom = smartSettings.philosophy === "Custom";

  content.innerHTML = `
    <section class="dashboard-grid">
      <div class="panel">
        <h3>Assignment Mode</h3>

        <label>Smart Assignment Mode</label>
        <select id="philosophy" onchange="previewSmartMode()">
          <option ${smartSettings.philosophy === "Balanced" ? "selected" : ""}>Balanced</option>
          <option ${smartSettings.philosophy === "Readiness Focused" ? "selected" : ""}>Readiness Focused</option>
          <option ${smartSettings.philosophy === "Training Focused" ? "selected" : ""}>Training Focused</option>
          <option ${smartSettings.philosophy === "Leadership Focused" ? "selected" : ""}>Leadership Focused</option>
          <option ${smartSettings.philosophy === "Custom" ? "selected" : ""}>Custom</option>
        </select>

        <div id="modeDescription" class="smart-result">
          ${getSmartModeDescription(smartSettings.philosophy)}
        </div>

        <button class="primary-btn settings-btn" onclick="applyPhilosophyPreset()">
          Apply Mode
        </button>
      </div>

      <div class="panel">
        <h3>Recommendation Display</h3>

        <label class="setting-check">
          <input type="checkbox" id="showRecommendationReasons" ${smartSettings.showRecommendationReasons !== false ? "checked" : ""}>
          Show plain-English recommendation reasons
        </label>

        <label class="setting-check">
          <input type="checkbox" id="futureLossPrediction" ${smartSettings.futureLossPrediction ? "checked" : ""}>
          Enable future loss prediction
        </label>

        <p class="member-notes">
          Watch Keeper will explain recommendations in plain English instead of showing math or scores.
        </p>
      </div>

      ${
        isCustom
          ? `
            <div class="panel">
              <h3>Custom Balance Weights</h3>
              ${renderSmartSettingToggle("personnelBalance", "personnelWeight", "Personnel Balance")}
              ${renderSmartSettingToggle("qualificationBalance", "qualificationWeight", "Qualification Balance")}
              ${renderSmartSettingToggle("departmentBalance", "departmentWeight", "Department Balance")}
              ${renderSmartSettingToggle("leadershipBalance", "leadershipWeight", "Leadership Balance")}
              ${renderSmartSettingToggle("rankBalance", "rankWeight", "Rank Balance")}
              ${renderSmartSettingToggle("breakInMentorPriority", "breakInWeight", "Break-In Mentor Priority")}
            </div>

            <div class="panel">
              <h3>Custom Critical Qualification Priority</h3>

              ${Object.keys(smartSettings.criticalQualWeights).map(qual => `
                <label>${qual} Weight</label>
                <input type="number" min="0" max="10" id="qualWeight_${qual}" value="${smartSettings.criticalQualWeights[qual]}">
              `).join("")}
            </div>
          `
          : `
            <div class="panel wide">
              <h3>Current Mode Summary</h3>
              <p>${getSmartModeDescription(smartSettings.philosophy)}</p>
              <p class="member-notes">
                Advanced weights are hidden unless Assignment Mode is set to Custom.
              </p>
            </div>
          `
      }

      <div class="panel wide">
        <button class="primary-btn settings-btn" onclick="saveSmartAssignmentSettings()">
          Save Smart Assignment Settings
        </button>
      </div>
    </section>
  `;
}

window.previewSmartMode = function() {
  const mode = safeValue("philosophy", smartSettings.philosophy);
  const description = document.getElementById("modeDescription");
  if (description) description.textContent = getSmartModeDescription(mode);
};

window.applyPhilosophyPreset = function() {
  const philosophy = safeValue("philosophy", smartSettings.philosophy);

  if (philosophy === "Balanced") {
    smartSettings.personnelWeight = 5;
    smartSettings.qualificationWeight = 8;
    smartSettings.departmentWeight = 8;
    smartSettings.leadershipWeight = 5;
    smartSettings.rankWeight = 5;
    smartSettings.breakInWeight = 7;
  }

  if (philosophy === "Readiness Focused") {
    smartSettings.personnelWeight = 3;
    smartSettings.qualificationWeight = 10;
    smartSettings.departmentWeight = 7;
    smartSettings.leadershipWeight = 4;
    smartSettings.rankWeight = 4;
    smartSettings.breakInWeight = 3;
  }

  if (philosophy === "Training Focused") {
    smartSettings.personnelWeight = 4;
    smartSettings.qualificationWeight = 5;
    smartSettings.departmentWeight = 5;
    smartSettings.leadershipWeight = 3;
    smartSettings.rankWeight = 4;
    smartSettings.breakInWeight = 10;
  }

  if (philosophy === "Leadership Focused") {
    smartSettings.personnelWeight = 4;
    smartSettings.qualificationWeight = 6;
    smartSettings.departmentWeight = 5;
    smartSettings.leadershipWeight = 10;
    smartSettings.rankWeight = 8;
    smartSettings.breakInWeight = 4;
  }

  smartSettings.philosophy = philosophy;
  saveSmartSettings();
  renderSmartAssignmentSettings();
};

window.saveSmartAssignmentSettings = function() {
  smartSettings.philosophy = safeValue("philosophy", smartSettings.philosophy);
  smartSettings.futureLossPrediction = document.getElementById("futureLossPrediction")?.checked || false;
  smartSettings.showRecommendationReasons = document.getElementById("showRecommendationReasons")?.checked || false;

  if (smartSettings.philosophy === "Custom") {
    smartSettings.personnelBalance = document.getElementById("personnelBalance")?.checked || false;
    smartSettings.personnelWeight = Number(safeValue("personnelWeight", smartSettings.personnelWeight));

    smartSettings.qualificationBalance = document.getElementById("qualificationBalance")?.checked || false;
    smartSettings.qualificationWeight = Number(safeValue("qualificationWeight", smartSettings.qualificationWeight));

    smartSettings.departmentBalance = document.getElementById("departmentBalance")?.checked || false;
    smartSettings.departmentWeight = Number(safeValue("departmentWeight", smartSettings.departmentWeight));

    smartSettings.leadershipBalance = document.getElementById("leadershipBalance")?.checked || false;
    smartSettings.leadershipWeight = Number(safeValue("leadershipWeight", smartSettings.leadershipWeight));

    smartSettings.rankBalance = document.getElementById("rankBalance")?.checked || false;
    smartSettings.rankWeight = Number(safeValue("rankWeight", smartSettings.rankWeight));

    smartSettings.breakInMentorPriority = document.getElementById("breakInMentorPriority")?.checked || false;
    smartSettings.breakInWeight = Number(safeValue("breakInWeight", smartSettings.breakInWeight));

    Object.keys(smartSettings.criticalQualWeights).forEach(qual => {
      smartSettings.criticalQualWeights[qual] = Number(safeValue(`qualWeight_${qual}`, smartSettings.criticalQualWeights[qual]));
    });
  }

  saveSmartSettings();
};

// ---------- Assets ----------
function getAssetStatusBadge(status) {
  return `<span class="asset-status-badge ${status}">${status}</span>`;
}

function getAssetSummary() {
  return {
    total: assets.length,
    fmc: assets.filter(asset => asset.status === "FMC").length,
    pmc: assets.filter(asset => asset.status === "PMC").length,
    nmc: assets.filter(asset => asset.status === "NMC").length
  };
}

function sortAssetsByType(assetList) {
  const typeOrder = [
    "45 RB-M",
    "33 SPC-LE",
    "29 RBS-II",
    "24 SPC-SW",
    "Other"
  ];

  return [...assetList].sort((a, b) => {
    const typeA = typeOrder.indexOf(a.type);
    const typeB = typeOrder.indexOf(b.type);

    const safeTypeA = typeA === -1 ? 999 : typeA;
    const safeTypeB = typeB === -1 ? 999 : typeB;

    if (safeTypeA !== safeTypeB) return safeTypeA - safeTypeB;

    return (a.name || "").localeCompare(b.name || "");
  });
}

function renderAssets() {
  const summary = getAssetSummary();
  const sortedAssets = sortAssetsByType(assets);

  pageTitle.textContent = "Assets";
  pageSubtitle.textContent = "Small boat asset roster";

  content.innerHTML = `
    <section class="cards">
      <div class="card">
        <p>Total Assets</p>
        <h3>${summary.total}</h3>
      </div>

      <div class="card ready">
        <p>FMC</p>
        <h3>${summary.fmc}</h3>
      </div>

      <div class="card warning">
        <p>PMC</p>
        <h3>${summary.pmc}</h3>
      </div>

      <div class="card not-ready-panel">
        <p>NMC</p>
        <h3>${summary.nmc}</h3>
      </div>
    </section>

    <section class="roster-grid">
      ${
        sortedAssets.length === 0
          ? `<div class="panel wide"><p class="empty-text">No assets added.</p></div>`
          : sortedAssets.map(asset => {
              const index = assets.indexOf(asset);

              return `
                <div class="member-card">
                  <div class="member-header">
                    <div>
                      <h4>${asset.name}</h4>
                      <p>${asset.type} | ${getAssetStatusBadge(asset.status)}</p>
                      <p>Pursuit Capable: ${asset.pursuit}</p>
                      <p>Crew Size: ${asset.crewSize || "4"}</p>
                      <p>Mission Profile: ${asset.missionProfile || "SAR"}</p>
                    </div>

                    <div class="member-actions">
                      <button class="action-btn" onclick="editAsset(${index})">Edit</button>
                      <button class="action-btn delete-btn" onclick="deleteAsset(${index})">Delete</button>
                    </div>
                  </div>

                  ${
                    asset.status === "PMC" && asset.pmcDescription
                      ? `<p class="member-notes"><strong>PMC:</strong> ${asset.pmcDescription}</p>`
                      : ""
                  }

                  ${asset.notes ? `<p class="member-notes">${asset.notes}</p>` : ""}
                </div>
              `;
            }).join("")
      }
    </section>
  `;
}

window.addAsset = function() {
  const name = safeValue("assetName").trim();
  const type = safeValue("assetType", "45 RB-M");
  const pursuit = safeValue("assetPursuit", "Yes");
  const crewSize = safeValue("assetCrewSize", "4");
  const missionProfile = safeValue("assetMissionProfile", "SAR");
  const status = safeValue("assetStatus", "FMC");
  const pmcDescription = safeValue("assetPmcDescription").trim();
  const notes = safeValue("assetNotes").trim();

  if (!name) {
    const nameInput = document.getElementById("assetName");
    if (nameInput) nameInput.focus();
    return;
  }

  const assetData = {
    name,
    type,
    pursuit,
    crewSize,
    missionProfile,
    status,
    pmcDescription,
    notes
  };

  if (editingAssetIndex === null) {
    assets.push(assetData);
  } else {
    assets[editingAssetIndex] = assetData;
  }

  saveAssets();
  closeAssetModal();
  renderAssets();
};

window.editAsset = function(index) {
  const asset = assets[index];
  if (!asset) return;

  editingAssetIndex = index;

  if (assetModalTitle) assetModalTitle.textContent = "Edit Asset";

  setValue("assetName", asset.name || "");
  setValue("assetType", asset.type || "45 RB-M");
  setValue("assetPursuit", asset.pursuit || "Yes");
  setValue("assetCrewSize", asset.crewSize || "4");
  setValue("assetMissionProfile", asset.missionProfile || "SAR");
  setValue("assetStatus", asset.status || "FMC");
  setValue("assetPmcDescription", asset.pmcDescription || "");
  setValue("assetNotes", asset.notes || "");

  if (asset.status === "PMC") {
    showElement("pmcBox");
  } else {
    hideElement("pmcBox");
  }

  assetModal.classList.remove("hidden");

  const modalCard = assetModal.querySelector(".modal-card");
  if (modalCard) modalCard.scrollTop = 0;

  setTimeout(() => {
    const nameInput = document.getElementById("assetName");
    if (nameInput) nameInput.focus();
  }, 150);
};

window.deleteAsset = function(index) {
  assets.splice(index, 1);
  saveAssets();
  renderAssets();
};

// ---------- Asset Mission Helpers ----------
function getAssetForMission(missionType) {
  const readyAssets = assets.filter(asset => asset.status === "FMC");
  const partialAssets = assets.filter(asset => asset.status === "PMC");

  if (missionType === "Pursuit") {
    const readyPursuit = readyAssets.find(asset => asset.pursuit === "Yes");
    const partialPursuit = partialAssets.find(asset => asset.pursuit === "Yes");

    if (readyPursuit) {
      return {
        status: "ready",
        asset: readyPursuit,
        message: `${readyPursuit.name} - ${readyPursuit.type} - FMC`
      };
    }

    if (partialPursuit) {
      return {
        status: "partial",
        asset: partialPursuit,
        message: `${partialPursuit.name} - ${partialPursuit.type} - PMC: ${partialPursuit.pmcDescription || "No description provided"}`
      };
    }

    return {
      status: "none",
      asset: null,
      message: "No FMC or PMC pursuit-capable asset available."
    };
  }

  const readyAny = readyAssets[0];
  const partialAny = partialAssets[0];

  if (readyAny) {
    return {
      status: "ready",
      asset: readyAny,
      message: `${readyAny.name} - ${readyAny.type} - FMC`
    };
  }

  if (partialAny) {
    return {
      status: "partial",
      asset: partialAny,
      message: `${partialAny.name} - ${partialAny.type} - PMC: ${partialAny.pmcDescription || "No description provided"}`
    };
  }

  return {
    status: "none",
    asset: null,
    message: "No FMC or PMC asset available."
  };
}

// ---------- Scenario Builder ----------

function renderScenarioBuilder() {
  pageTitle.textContent = "Missions";
  pageSubtitle.textContent = "Mission planning, patrol planning, and print tools";

  content.innerHTML = `
    <section class="scenario-layout">
      <div class="panel">
        <h3>Mission Tools</h3>

        <button class="primary-btn scenario-btn" onclick="showDailyCrewPlanner()">
          Daily Duty Patrol Planner
        </button>

        <button class="primary-btn scenario-btn" onclick="showMissionPackageBuilder()">
          Mission Package Builder
        </button>

        <button class="secondary-btn scenario-btn" onclick="showSavedMissionPackages()">
          Saved Mission Packages
        </button>

        <button class="secondary-btn scenario-btn" onclick="showPrintCenter()">
          Print Center
        </button>
      </div>

      <div class="panel scenario-results-panel">
        <h3>Mission Workspace</h3>
        <div id="scenarioResult">
          Select a mission tool to begin.
        </div>
      </div>
    </section>
  `;
}

function showAvailabilityScenarioPanel() {
  const sortedCrew = sortMembers(crew);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Availability Scenario</h4>
      <p>
        Temporarily mark selected personnel unavailable without changing the saved roster.
      </p>
    </div>

    <label>Temporary Status</label>
    <select id="scenarioStatus">
      <option>Leave</option>
      <option>TDY</option>
      <option>Medical</option>
      <option>Restricted</option>
      <option>PCS</option>
      <option>A-School</option>
      <option>Retirement</option>
      <option>Separation</option>
    </select>

    <h4>Affected Personnel</h4>

    <div class="scenario-personnel-list compact">
      ${
        sortedCrew.length === 0
          ? `<p>No members available.</p>`
          : sortedCrew.map(member => {
              const index = crew.indexOf(member);

              return `
                <label class="scenario-person">
                  <input type="checkbox" value="${index}">
                  <span>${getFullDisplayName(member)} - ${member.section}</span>
                </label>
              `;
            }).join("")
      }
    </div>

    <button class="primary-btn scenario-btn" onclick="runScenario()">
      Run Availability Scenario
    </button>
  `;
}

function showCrewGeneratorPanel() {
  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Crew Generator</h4>
      <p>Select the type of crew Watch Keeper should generate.</p>
    </div>

    <button class="primary-btn scenario-btn" onclick="generateSkeletonCrew()">
      Skeleton Crew
    </button>

    <button class="primary-btn scenario-btn" onclick="generateSarCrew()">
      SAR Crew
    </button>

    <button class="primary-btn scenario-btn" onclick="generatePursuitCrew()">
      Pursuit Crew
    </button>

    <button class="primary-btn scenario-btn" onclick="generateRandomCrew()">
      Random Crew
    </button>
  `;
}

const trackedQualificationOptions = [
  "PCXC",
  "CXC",
  "Engineer",
  "Boarding Team Member",
  "Boat Crewman",
  "Watchstander",
  "OOD"
];

function getMemberTrackedQuals(member) {
  return member.trackedQuals || [];
}

function getTrackedQualSummary(member) {
  const tracked = getMemberTrackedQuals(member);

  if (tracked.length === 0) {
    return "No active break-ins tracked.";
  }

  const problem = tracked.find(item =>
    getSingleTrackedQualStatus(item).isProblem
  );

  if (problem) {
    return getSingleTrackedQualStatus(problem).label;
  }

  return `Breaking in: ${tracked.map(item => item.qual).join(", ")}`;
}

function getSingleTrackedQualStatus(item) {
  if (item.status === "ET") {
    return {
      label: `ET for ${item.qual}`,
      className: "qual-problem-text",
      isProblem: true
    };
  }

  if (item.status === "PERFORMANCE PROBATION") {
    return {
      label: `Performance probation for ${item.qual}`,
      className: "qual-problem-text",
      isProblem: true
    };
  }

  if (item.dueDate) {
    const status = getQualDueStatus(item.dueDate);

    if (status.className === "qual-overdue") {
      return {
        label: `OVERDUE for ${item.qual}`,
        className: "qual-problem-text",
        isProblem: true
      };
    }
  }

  return {
    label: `Breaking in: ${item.qual}`,
    className: "member-notes",
    isProblem: false
  };
}

function showTrainingScenarioPanel() {
  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Training Crew Generator</h4>
      <p>Build a training crew with mentors and break-ins when available.</p>
    </div>

    <label>Training Type</label>
    <select id="trainingType">
      <option>Boat Crew Training</option>
      <option>Engineer Training</option>
      <option>Boarding Team Training</option>
      <option>Pursuit Training</option>
    </select>

    <button class="primary-btn scenario-btn" onclick="generateTrainingCrew()">
      Generate Training Crew
    </button>
  `;
}

function showDailyCrewPlanner() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const missionDate = dashboardDutyDate;
  const availableCrew = getAvailableCrewForMissionDate(missionDate);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Daily Duty Patrol Planner</h4>
      <p>
        Manually build a duty-section patrol, underway, or training crew for a specific duty date.
      </p>
    </div>

    <label>Duty Date</label>
    <input id="dailyCrewDate" type="date" value="${dashboardDutyDate}">

    <label>Patrol / Underway Type</label>
    <select id="dailyCrewType">
      <option>ELT-DRUG</option>
      <option>ELT-MIGRANT</option>
      <option>RBS</option>
      <option>Training</option>
    </select>

    <label>Start Time</label>
    <input id="dailyCrewStartTime" type="time">

    <label>End Time</label>
    <input id="dailyCrewEndTime" type="time">

    <label>Asset</label>
    <select id="dailyCrewAsset">
      ${
        missionAssets.length === 0
          ? `<option value="">No FMC/PMC assets available</option>`
          : missionAssets.map((asset, index) => `
              <option value="${index}">
                ${asset.name} - ${asset.type} - ${asset.status}
              </option>
            `).join("")
      }
    </select>

    <h4>Crew Assignment</h4>

    <label>Coxswain / PCXC / CXC</label>
    <select id="dailyCrewCoxswain">
      ${renderQualifiedCrewOptions("Coxswain", missionDate)}
    </select>

    <label>Engineer</label>
    <select id="dailyCrewEngineer">
      ${renderQualifiedCrewOptions("Engineer", missionDate)}
    </select>

    <label>Boarding Officer</label>
    <select id="dailyCrewBO">
      ${renderQualifiedCrewOptions("BO", missionDate)}
    </select>

    <label>Boarding Team Member</label>
    <select id="dailyCrewBTM">
      ${renderQualifiedCrewOptions("BTM", missionDate)}
    </select>

    <label>Crewman / Additional Crew</label>
    <select id="dailyCrewCR">
      ${renderQualifiedCrewOptions("Crewman", missionDate)}
    </select>

    <label>Notes</label>
    <textarea id="dailyCrewNotes" placeholder="Example: required patrol, local RBS, training underway, etc."></textarea>

    <button class="primary-btn scenario-btn" onclick="saveManualDailyDutyCrew()">
      Save Daily Patrol Crew
    </button>
  `;
}

window.saveManualDailyDutyCrew = function() {
  const dutyDate = document.getElementById("dailyCrewDate").value || dashboardDutyDate;
  const crewType = document.getElementById("dailyCrewType").value;
  const startTime = document.getElementById("dailyCrewStartTime").value;
  const endTime = document.getElementById("dailyCrewEndTime").value;
  const notes = document.getElementById("dailyCrewNotes").value.trim();

  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAssetIndex = Number(document.getElementById("dailyCrewAsset").value);
  const selectedAsset = missionAssets[selectedAssetIndex];

  if (!selectedAsset) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select an FMC or PMC asset.</p>
      </div>
    `);
    return;
  }

  const selectedRoles = [
    {
      role: "Coxswain / PCXC / CXC",
      member: crew[Number(document.getElementById("dailyCrewCoxswain").value)]
    },
    {
      role: "Engineer",
      member: crew[Number(document.getElementById("dailyCrewEngineer").value)]
    },
    {
      role: "Boarding Officer",
      member: crew[Number(document.getElementById("dailyCrewBO").value)]
    },
    {
      role: "Boarding Team Member",
      member: crew[Number(document.getElementById("dailyCrewBTM").value)]
    },
    {
      role: "Crewman / Additional Crew",
      member: crew[Number(document.getElementById("dailyCrewCR").value)]
    }
  ].filter(item => item.member);

  const leaveConflicts = selectedRoles.filter(item => {
    const memberIndex = crew.indexOf(item.member);
    return isMemberOnLeaveForDate(memberIndex, dutyDate);
  });

  if (leaveConflicts.length > 0) {
    const conflictNames = leaveConflicts
      .map(item => `${item.role}: ${getFullDisplayName(item.member)}`)
      .join(", ");

    const continueSave = confirm(
      `Warning: The following assigned crew are on leave for ${dutyDate}: ${conflictNames}. Save anyway?`
    );

    if (!continueSave) return;
  }

  const plannedCrew = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionType: crewType,
    patrolType: crewType,
    startTime,
    endTime,
    asset: selectedAsset,
    crew: selectedRoles, 
    notes,
    checklistHTML: "",
    dutyDate
  };

  plannedCrews.push(plannedCrew);
  savePlannedCrews();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-readiness ready-panel">
      <h4>Daily Patrol Crew Saved</h4>
      <p><strong>${crewType}</strong> saved for ${dutyDate}.</p>
      <p><strong>Time:</strong> ${startTime || "Not listed"} - ${endTime || "Not listed"}</p>
      <p>This crew will appear on the Dashboard when that date is selected.</p>
    </div>
  `;
};

function checkReadinessFromList(sectionName, crewList) {
  const members = sortMembers(crewList.filter(member =>
    member.section === sectionName &&
    member.status === "Available"
  ));

  const missing = [];

  readinessRequirements.forEach(req => {
    const hasRequirement = members.some(member => memberHasQual(member, req));
    if (!hasRequirement) missing.push(req);
  });

  return {
    section: sectionName,
    ready: missing.length === 0,
    missing,
    members
  };
}

function getDayWorkerOptionsFromList(requiredQual, crewList) {
  return sortMembers(crewList.filter(member =>
    member.section === "Day Worker" &&
    member.status === "Available" &&
    memberHasQual(member, requiredQual)
  ));
}

function renderScenarioReadinessResult(result, crewList) {
  return `
    <div class="scenario-readiness ${result.ready ? "ready-panel" : "not-ready-panel"}">
      <h4>${result.section} Section</h4>

      <p><strong>${result.ready ? "MISSION CAPABLE" : "NOT MISSION CAPABLE"}</strong></p>

      ${
        result.ready
          ? `<p>No missing minimum qualifications.</p>`
          : `
            <p>Missing:</p>

            <div class="qual-row">
              ${result.missing.map(req => `<span class="badge missing-badge">${req}</span>`).join("")}
            </div>

            <p>Day Worker Standby Options:</p>

            <ul>
              ${
                result.missing.map(req => {
                  const options = getDayWorkerOptionsFromList(req, crewList);

                  if (options.length === 0) {
                    return `<li>${req}: No available Day Worker found.</li>`;
                  }

                  return `<li>${req}: ${options.map(member => getFullDisplayName(member)).join(", ")}</li>`;
                }).join("")
              }
            </ul>
          `
      }
    </div>
  `;
}

function renderQualifications() {
  pageTitle.textContent = "Qualifications";
  pageSubtitle.textContent = "Track break-ins, due dates, ET, and performance probation";

  const trackedCrew = getTrackedQualificationCrew();
  const filteredCrew = trackedCrew.filter(memberMatchesQualificationFilter);
  const summary = getQualificationSummary();

  content.innerHTML = `
    <section class="cards">
      <div class="card not-ready-panel">
        <p>Overdue</p>
        <h3>${summary.overdue}</h3>
      </div>

      <div class="card warning">
        <p>Due Soon</p>
        <h3>${summary.dueSoon}</h3>
      </div>

      <div class="card">
        <p>ET</p>
        <h3>${summary.et}</h3>
      </div>

      <div class="card">
        <p>Training Probation</p>
        <h3>${summary.trainingProbation}</h3>
      </div>
    </section>

    <div class="panel wide">
      <h3>Add Member to Qualification Tracking</h3>

      <label>Select Personnel</label>
      <select id="qualTrackingMemberSelect">
        ${
          crew.filter(member => !member.trackQualifications).length === 0
            ? `<option value="">All personnel are already being tracked.</option>`
            : crew.filter(member => !member.trackQualifications).map(member => {
                const index = crew.indexOf(member);

                return `
                  <option value="${index}">
                    ${getFullDisplayName(member)} - ${member.section}
                  </option>
                `;
              }).join("")
        }
      </select>

      <button class="primary-btn" onclick="addSelectedMemberToQualificationTracking()">
        Add to Tracking
      </button>
    </div>

    <div class="panel wide">
      <h3>Filter</h3>

      <div class="dashboard-date-actions">
        <button class="${qualificationFilter === "All" ? "primary-btn" : "secondary-btn"}" onclick="setQualificationFilter('All')">
          All
        </button>

        <button class="${qualificationFilter === "Overdue" ? "primary-btn" : "secondary-btn"}" onclick="setQualificationFilter('Overdue')">
          Overdue
        </button>

        <button class="${qualificationFilter === "Due Soon" ? "primary-btn" : "secondary-btn"}" onclick="setQualificationFilter('Due Soon')">
          Due Soon
        </button>

        <button class="${qualificationFilter === "ET" ? "primary-btn" : "secondary-btn"}" onclick="setQualificationFilter('ET')">
          ET
        </button>

        <button class="${qualificationFilter === "Training Probation" ? "primary-btn" : "secondary-btn"}" onclick="setQualificationFilter('Training Probation')">
          Training Probation
        </button>
      </div>
    </div>

    <section class="dashboard-grid">
      ${
        filteredCrew.length === 0
          ? `<div class="panel wide"><p class="empty-text">No personnel are currently being tracked for qualifications.</p></div>`
          : filteredCrew.map(member => {
              const index = crew.indexOf(member);
              const isOpen = openQualificationMemberId === index;
              const summaryText = getTrackedQualSummary(member);
              const hasProblem = summaryText.includes("OVERDUE") || summaryText.includes("ET") || summaryText.includes("probation");

              return `
                <div class="panel wide qualification-accordion-card">
                  <div class="qualification-accordion-header" onclick="toggleQualificationAccordion(${index})">
                    <div>
                      <h3>${getFullDisplayName(member)}</h3>

                      <p class="${hasProblem ? "qual-problem-text" : "member-notes"}">
                        ${summaryText}
                      </p>
                    </div>

                    <button class="secondary-btn">
                      ${isOpen ? "Close" : "Open"}
                    </button>
                  </div>

                  ${
                    isOpen
                      ? renderQualificationAccordionBody(member, index)
                      : ""
                  }
                </div>
              `;
            }).join("")
      }
    </section>
  `;
}

function renderQualificationAccordionBody(member, index) {
  const tracked = getMemberTrackedQuals(member);

  return `
    <div class="qualification-accordion-body">
      <h4>Tracked Qualifications</h4>

      ${
        tracked.length === 0
          ? `<p class="empty-text">No qualifications added yet.</p>`
          : tracked.map((item, qualIndex) => {
              const status = getSingleTrackedQualStatus(item);

              return `
                <div class="member-card">
                  <h4>${item.qual}</h4>

                  <p class="${status.className}">
                    ${status.label}
                  </p>

                  <label>Due Date</label>
                  <input
                    type="date"
                    value="${item.dueDate || ""}"
                    onchange="updateTrackedQualDueDate(${index}, ${qualIndex}, this.value)"
                  >

                  <label>Status</label>
                  <select onchange="updateTrackedQualStatus(${index}, ${qualIndex}, this.value)">
                    <option value="" ${!item.status ? "selected" : ""}>None</option>
                    <option value="ET" ${item.status === "ET" ? "selected" : ""}>ET</option>
                    <option value="PERFORMANCE PROBATION" ${item.status === "PERFORMANCE PROBATION" ? "selected" : ""}>Performance Probation</option>
                  </select>

                  <button class="delete-btn" onclick="removeTrackedQualFromMember(${index}, ${qualIndex})">
                    Remove Qualification
                  </button>
                </div>
              `;
            }).join("")
      }

      <div class="member-card">
        <h4>Add Qualification</h4>

        <label>Qualification</label>
        <select id="newTrackedQual_${index}">
          ${trackedQualificationOptions.map(qual => `
            <option>${qual}</option>
          `).join("")}
        </select>

        <label>Due Date</label>
        <input id="newTrackedQualDate_${index}" type="date">

        <button class="primary-btn" onclick="addTrackedQualToMember(${index})">
          Add Qualification
        </button>
      </div>

      <button class="secondary-btn" onclick="removeMemberFromQualificationTracking(${index})">
        Remove Member from Tracking
      </button>
    </div>
  `;
}

window.toggleQualificationAccordion = function(index) {
  openQualificationMemberId =
    openQualificationMemberId === index
      ? null
      : index;

  renderQualifications();
};

window.addTrackedQualToMember = function(index) {
  const member = crew[index];
  if (!member) return;

  if (!member.trackedQuals) {
    member.trackedQuals = [];
  }

  const qual = document.getElementById(`newTrackedQual_${index}`).value;
  const dueDate = document.getElementById(`newTrackedQualDate_${index}`).value;

  member.trackedQuals.push({
    qual,
    dueDate,
    status: ""
  });

  member.trackQualifications = true;

  saveCrew();
  renderQualifications();
};

window.updateTrackedQualDueDate = function(index, qualIndex, value) {
  if (!crew[index]?.trackedQuals?.[qualIndex]) return;

  crew[index].trackedQuals[qualIndex].dueDate = value;

  saveCrew();
  renderQualifications();
};

window.updateTrackedQualStatus = function(index, qualIndex, value) {
  if (!crew[index]?.trackedQuals?.[qualIndex]) return;

  crew[index].trackedQuals[qualIndex].status = value;

  saveCrew();
  renderQualifications();
};

window.removeTrackedQualFromMember = function(index, qualIndex) {
  if (!crew[index]?.trackedQuals) return;

  crew[index].trackedQuals.splice(qualIndex, 1);

  saveCrew();
  renderQualifications();
};

function getTrackedQualificationCrew() {
  return crew.filter(member => member.trackQualifications === true);
}

window.addMemberToQualificationTracking = function(index) {
  if (!crew[index]) return;

  crew[index].trackQualifications = true;

  if (!crew[index].qualDueDates) {
    crew[index].qualDueDates = {};
  }

  saveCrew();
  viewPersonnelDetails(index);
};

window.removeMemberFromQualificationTracking = function(index) {
  if (!crew[index]) return;

  crew[index].trackQualifications = false;
  crew[index].qualificationStatus = "";
  crew[index].qualDueDates = {};
  crew[index].trackedQuals = [];

  saveCrew();
  renderQualifications();
};

function getQualificationSummary() {
  let overdue = 0;
  let dueSoon = 0;
  let et = 0;
  let trainingProbation = 0;

  const trackedCrew = getTrackedQualificationCrew();

  trackedCrew.forEach(member => {
    getMemberTrackedQuals(member).forEach(item => {
      const status = getSingleTrackedQualStatus(item);

      if (status.label.includes("OVERDUE")) overdue++;
      if (item.status === "ET") et++;
      if (item.status === "PERFORMANCE PROBATION") trainingProbation++;

      if (item.dueDate) {
        const dueStatus = getQualDueStatus(item.dueDate);
        if (dueStatus.className === "qual-warning") dueSoon++;
      }
    });
  });

  return {
    overdue,
    dueSoon,
    et,
    trainingProbation
  };
}

window.addSelectedMemberToQualificationTracking = function() {
  const select = document.getElementById("qualTrackingMemberSelect");

  if (!select || select.value === "") return;

  const index = Number(select.value);

  if (!crew[index]) return;

  crew[index].trackQualifications = true;

  if (!crew[index].qualDueDates) {
    crew[index].qualDueDates = {};
  }

  saveCrew();
  renderQualifications();
};

function memberMatchesQualificationFilter(member) {
  if (qualificationFilter === "All") return true;

  if (qualificationFilter === "Overdue") {
    return memberHasOverdueQual(member);
  }

  if (qualificationFilter === "Due Soon") {
    if (!member.qualDueDates) return false;

    return Object.values(member.qualDueDates).some(dateString => {
      const status = getQualDueStatus(dateString);
      return status.className === "qual-warning";
    });
  }

  if (qualificationFilter === "ET") {
    return member.qualificationStatus === "ET";
  }

  if (qualificationFilter === "Training Probation") {
    return member.qualificationStatus === "TRAINING PROBATION";
  }

  return true;
}

window.setQualificationFilter = function(filter) {
  qualificationFilter = filter;
  renderQualifications();
};

function getQualDueStatus(dateString) {
  if (!dateString) {
    return {
      label: "No Date",
      className: "qual-no-date"
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return {
      label: `OVERDUE by ${Math.abs(daysUntil)} days`,
      className: "qual-overdue"
    };
  }

  if (daysUntil <= 30) {
    return {
      label: `Due in ${daysUntil} days`,
      className: "qual-warning"
    };
  }

  return {
    label: `Current - ${daysUntil} days`,
    className: "qual-current"
  };
}

function memberHasOverdueQual(member) {
  if (!member.qualDueDates) return false;

  return Object.values(member.qualDueDates).some(dateString => {
    const status = getQualDueStatus(dateString);
    return status.className === "qual-overdue";
  });
}

function showPrintCenter() {

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Print Center</h4>

      <p>
        Generate printable planning documents for operations,
        duty days, training, and missions.
      </p>
    </div>

    <button class="primary-btn scenario-btn"
      onclick="showDailyPlanPrint()">
      Daily Duty Plan
    </button>

    <button class="primary-btn scenario-btn"
      onclick="showMissionPlanPrint()">
      Mission Planning Sheet
    </button>

    <button class="secondary-btn scenario-btn"
      onclick="window.print()">
      Print Current Dashboard
    </button>
  `;
}

function showDailyPlanPrint() {

  const crews =
    plannedCrews.filter(
      crew => crew.dutyDate === dashboardDutyDate
    );

  const section =
    getDutySectionForDate(dashboardDutyDate);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="print-sheet printable-report">

      <h2>WATCH KEEPER DAILY DUTY PLAN</h2>

      <p>
        <strong>Date:</strong>
        ${dashboardDutyDate}
      </p>

      <p>
        <strong>Duty Section:</strong>
        ${section}
      </p>

      ${
        crews.length === 0
          ? `
            <p>
              No planned crews saved.
            </p>
          `
          : crews.map(plan => `
              <div class="scenario-summary">

                <h3>${plan.missionType}</h3>

                <p>
                  <strong>Asset:</strong>
                  ${plan.asset.name}
                </p>

                <ul>
                  ${plan.crew.map(item => `
                    <li>
                      <strong>${item.role}</strong> —
                      ${getFullDisplayName(item.member)}
                    </li>
                  `).join("")}
                </ul>

                ${
                  plan.notes
                    ? `
                      <p>
                        <strong>Notes:</strong>
                        ${plan.notes}
                      </p>
                    `
                    : ""
                }

              </div>
          `).join("")
      }

      <button
        class="primary-btn scenario-btn no-print"
        onclick="window.print()"
      >
        Print Daily Plan
      </button>

    </div>
  `;
}

function showMissionPlanPrint() {

  document.getElementById("scenarioResult").innerHTML = `
    <div class="print-sheet">

      <h2>MISSION PLANNING SHEET</h2>

      <label>Mission Name</label>
      <input id="missionName">

      <label>Mission Type</label>
      <input id="missionType">

      <label>Location</label>
      <input id="missionLocation">

      <label>Primary Asset</label>
      <input id="missionAsset">

      <label>Mission Objective</label>
      <textarea id="missionObjective"></textarea>

      <label>Weather</label>
      <textarea id="missionWeather"></textarea>

      <label>Communications Plan</label>
      <textarea id="missionComms"></textarea>

      <label>Risk Factors</label>
      <textarea id="missionRisk"></textarea>

      <label>Additional Notes</label>
      <textarea id="missionNotes"></textarea>

      <button
        class="primary-btn scenario-btn"
        onclick="generateMissionPlanningSheet()"
      >
        Generate Printable Sheet
      </button>

    </div>
  `;
}

function generateMissionPlanningSheet() {

  const missionName =
    document.getElementById("missionName").value;

  const missionType =
    document.getElementById("missionType").value;

  const location =
    document.getElementById("missionLocation").value;

  const asset =
    document.getElementById("missionAsset").value;

  const objective =
    document.getElementById("missionObjective").value;

  const weather =
    document.getElementById("missionWeather").value;

  const comms =
    document.getElementById("missionComms").value;

  const risk =
    document.getElementById("missionRisk").value;

  const notes =
    document.getElementById("missionNotes").value;

  document.getElementById("scenarioResult").innerHTML = `
    <div class="print-sheet printable-report">

      <h2>${missionName}</h2>

      <p><strong>Mission Type:</strong> ${missionType}</p>

      <p><strong>Location:</strong> ${location}</p>

      <p><strong>Primary Asset:</strong> ${asset}</p>

      <h3>Mission Objective</h3>
      <p>${objective}</p>

      <h3>Weather</h3>
      <p>${weather}</p>

      <h3>Communications Plan</h3>
      <p>${comms}</p>

      <h3>Risk Factors</h3>
      <p>${risk}</p>

      <h3>Notes</h3>
      <p>${notes}</p>

      <button
        class="primary-btn scenario-btn no-print"
        onclick="window.print()"
      >
        Print Mission Sheet
      </button>

    </div>
  `;
}

window.updateQualDueDate = function(index, qual, value) {
  if (!crew[index]) return;

  if (!crew[index].qualDueDates) {
    crew[index].qualDueDates = {};
  }

  if (value) {
    crew[index].qualDueDates[qual] = value;
  } else {
    delete crew[index].qualDueDates[qual];
  }

  saveCrew();
};

window.updateQualificationStatus = function(index, value) {
  if (!crew[index]) return;

  crew[index].qualificationStatus = value;
  saveCrew();

  renderQualifications();
};

window.runScenario = function() {
  const selectedInputs = [...document.querySelectorAll(".scenario-person input:checked")];

  if (selectedInputs.length === 0) {
    const result = document.getElementById("scenarioResult");
    result.innerHTML = `
      <div class="scenario-readiness not-ready-panel">
        <h4>No Personnel Selected</h4>
        <p>Select at least one affected member.</p>
      </div>
    `;
    return;
  }

  const temporaryStatus = safeValue("scenarioStatus", "Leave");
  const simulatedCrew = JSON.parse(JSON.stringify(crew));
  const affectedMembers = [];

  selectedInputs.forEach(input => {
    const originalIndex = Number(input.value);
    if (!simulatedCrew[originalIndex]) return;

    simulatedCrew[originalIndex].status = temporaryStatus;
    affectedMembers.push(simulatedCrew[originalIndex]);
  });

  const portResult = checkReadinessFromList("PORT", simulatedCrew);
  const stbdResult = checkReadinessFromList("STBD", simulatedCrew);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Availability Scenario Applied</h4>
      <p><strong>Temporary Status:</strong> ${temporaryStatus}</p>

      <p><strong>Affected Personnel:</strong></p>
      <ul>
        ${affectedMembers.map(member => `<li>${getFullDisplayName(member)} - ${member.section}</li>`).join("")}
      </ul>
    </div>

    ${renderScenarioReadinessResult(portResult, simulatedCrew)}
    ${renderScenarioReadinessResult(stbdResult, simulatedCrew)}
  `;
};

window.generateDailyDutyCrewDraft = function() {
  const dutyDate = document.getElementById("dailyCrewDate").value;
  const crewType = document.getElementById("dailyCrewType").value;
  const notes = document.getElementById("dailyCrewNotes").value.trim();

  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAssetIndex = Number(document.getElementById("dailyCrewAsset").value);
  const selectedAsset = missionAssets[selectedAssetIndex];

  if (!dutyDate) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select a duty date.</p>
      </div>
    `);
    return;
  }

  if (!selectedAsset) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select an FMC or PMC asset.</p>
      </div>
    `);
    return;
  }

  let missionType = "SAR";

  if (crewType === "Patrol Crew") missionType = "SAR";
  if (crewType === "Standby SAR Crew") missionType = "SAR";
  if (crewType === "Training Crew") missionType = "Training";
  if (crewType === "Mission Crew") missionType = selectedAsset.missionProfile || "SAR";

  const generatedCrew = buildMissionCrewForType(missionType);
  const availableCrew = getAvailableCrewForGenerators();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report">
      <h3>Daily Duty Crew Draft</h3>

      <div class="scenario-summary">
        <p><strong>Duty Date:</strong> ${dutyDate}</p>
        <p><strong>Crew Type:</strong> ${crewType}</p>
        <p><strong>Asset:</strong> ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}</p>
        <p><strong>Notes:</strong> ${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-readiness ${generatedCrew.missingRoles.length === 0 ? "ready-panel" : "not-ready-panel"}">
        <h4>Review / Override Crew</h4>

        ${Object.keys(generatedCrew.filledRoles).map(role => `
          <label>${role}</label>
          <select class="daily-role-select" data-role="${role}">
            ${availableCrew.map(member => `
              <option
                value="${crew.indexOf(member)}"
                ${crew.indexOf(member) === crew.indexOf(generatedCrew.filledRoles[role]) ? "selected" : ""}
              >
                ${getFullDisplayName(member)} - ${member.section}
              </option>
            `).join("")}
          </select>
        `).join("")}

        ${
          generatedCrew.missingRoles.length > 0
            ? `
              <h4>Missing Roles</h4>
              <div class="qual-row">
                ${generatedCrew.missingRoles.map(role => `<span class="badge missing-badge">${role}</span>`).join("")}
              </div>
            `
            : `<p class="member-notes">All roles filled. Review or override before saving.</p>`
        }
      </div>

      <button class="primary-btn scenario-btn" onclick="saveDailyDutyCrew('${dutyDate}', '${crewType}', ${selectedAssetIndex}, \`${notes.replace(/`/g, "'")}\`)">
        Save Daily Duty Crew
      </button>

      <button class="secondary-btn scenario-btn" onclick="showDailyCrewPlanner()">
        Back
      </button>
    </div>
  `;
};

window.saveDailyDutyCrew = function(dutyDate, crewType, selectedAssetIndex, notes) {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAsset = missionAssets[selectedAssetIndex];

  const selectedRoles = [...document.querySelectorAll(".daily-role-select")].map(select => {
    const role = select.dataset.role;
    const member = crew[Number(select.value)];

    return {
      role,
      member
    };
  }).filter(item => item.member);

  const plannedCrew = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionType: crewType,
    asset: selectedAsset,
    crew: selectedRoles,
    notes,
    checklistHTML: "",
    dutyDate
  };

  const leaveConflicts = selectedRoles.filter(item => {
    const memberIndex = crew.indexOf(item.member);
    return isMemberOnLeaveForDate(memberIndex, dutyDate);
  });

  if (leaveConflicts.length > 0) {
    const conflictNames = leaveConflicts
      .map(item => `${item.role}: ${getFullDisplayName(item.member)}`)
      .join(", ");

    const continueSave = confirm(
      `Warning: The following assigned crew are on leave for ${dutyDate}: ${conflictNames}. Save anyway?`
    );

    if (!continueSave) return;
  }

  plannedCrews.push(plannedCrew);
  savePlannedCrews();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-readiness ready-panel">
      <h4>Daily Duty Crew Saved</h4>
      <p>${crewType} saved for ${dutyDate}.</p>
      <p>This crew will appear on the Dashboard when that date is selected.</p>
    </div>
  `;
};

// ---------- Crew Generator Helpers ----------
function getAvailableCrewForGenerators() {
  const leaveForDate = getLeaveItemsForDate(dashboardDutyDate);
  const unavailableIndexes = leaveForDate.map(item => item.memberIndex);

  return sortMembers(crew.filter((member, index) =>
    member.status === "Available" &&
    !unavailableIndexes.includes(index) &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));
}

function getAvailableCrewForMissionDate(missionDate) {
  const leaveForDate = getLeaveItemsForDate(missionDate);
  const unavailableIndexes = leaveForDate.map(item => item.memberIndex);

  return sortMembers(crew.filter((member, index) =>
    member.status === "Available" &&
    !unavailableIndexes.includes(index) &&
    member.dept !== "Galley" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));
}

function renderCrewResult(title, description, requiredRoles, filledRoles, missingRoles, extraSummary = "") {
  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>${title}</h4>
      <p>${description}</p>
      ${extraSummary}
    </div>

    ${
      missingRoles.length === 0
        ? `<div class="scenario-readiness ready-panel">
            <h4>Crew Found</h4>
            <ul>
              ${requiredRoles.map(role => `
                <li>
                  <strong>${role}:</strong>
                  ${getFullDisplayName(filledRoles[role])}
                </li>
              `).join("")}
            </ul>
          </div>`
        : `<div class="scenario-readiness not-ready-panel">
            <h4>Crew Incomplete</h4>

            <p>Filled Roles:</p>
            <ul>
              ${Object.keys(filledRoles).map(role => `
                <li>
                  <strong>${role}:</strong>
                  ${getFullDisplayName(filledRoles[role])}
                </li>
              `).join("") || "<li>No roles filled.</li>"}
            </ul>

            <p>Missing Roles:</p>
            <div class="qual-row">
              ${missingRoles.map(role => `<span class="badge missing-badge">${role}</span>`).join("")}
            </div>
          </div>`
    }
  `;
}

function buildCrewFromRoles(requiredRoles, roleChecks, randomize = false) {
  const availableCrew = getAvailableCrewForGenerators();
  const crewPool = randomize ? [...availableCrew].sort(() => Math.random() - 0.5) : availableCrew;

  const selectedCrew = [];
  const filledRoles = {};
  const missingRoles = [];

  requiredRoles.forEach(role => {
    const candidate = crewPool.find(member =>
      !selectedCrew.includes(member) &&
      roleChecks[role](member)
    );

    if (candidate) {
      selectedCrew.push(candidate);
      filledRoles[role] = candidate;
    } else {
      missingRoles.push(role);
    }
  });

  return {
    filledRoles,
    missingRoles
  };
}

window.generateSkeletonCrew = function() {
  const requiredRoles = ["OOD", "PCX", "PG", "ENG", "BO", "BTM"];

  const roleChecks = {
    OOD: member => memberHasQual(member, "OOD"),
    PCX: member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"),
    PG: member => memberHasQual(member, "PG"),
    ENG: member => memberHasQual(member, "ENG"),
    BO: member => memberHasQual(member, "BO"),
    BTM: member => memberHasQual(member, "BTM") || memberHasQual(member, "BO")
  };

  const result = buildCrewFromRoles(requiredRoles, roleChecks);

  renderCrewResult(
    "Skeleton Crew Generator",
    "Watch Keeper attempted to build a bare-minimum crew using available PORT, STBD, and Day Worker personnel.",
    requiredRoles,
    result.filledRoles,
    result.missingRoles
  );
};

window.generateSarCrew = function() {
  const assetCheck = getAssetForMission("SAR");

  const requiredRoles = [
    "Coxswain",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const roleChecks = {
    "Coxswain": member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"),
    "Engineer": member => memberHasQual(member, "ENG"),
    "Boarding / Crew Support": member => memberHasQual(member, "BO") || memberHasQual(member, "BTM"),
    "Additional Crew": member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "ENG") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
  };

  const result = buildCrewFromRoles(requiredRoles, roleChecks);

  renderCrewResult(
    "SAR Crew Generator",
    "Watch Keeper attempted to build a SAR crew using available PORT, STBD, and Day Worker personnel.",
    requiredRoles,
    result.filledRoles,
    result.missingRoles,
    `<p><strong>Asset Check:</strong> ${assetCheck.message}</p>`
  );
};

window.generatePursuitCrew = function() {
  const assetCheck = getAssetForMission("Pursuit");

  const requiredRoles = [
    "Pursuit Coxswain",
    "Pursuit Gunner",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const roleChecks = {
    "Pursuit Coxswain": member => memberHasQual(member, "PCX"),
    "Pursuit Gunner": member => memberHasQual(member, "PG"),
    "Engineer": member => memberHasQual(member, "ENG"),
    "Boarding / Crew Support": member => memberHasQual(member, "BO") || memberHasQual(member, "BTM"),
    "Additional Crew": member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "ENG") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
  };

  const result = buildCrewFromRoles(requiredRoles, roleChecks);

  renderCrewResult(
    "Pursuit Crew Generator",
    "Watch Keeper attempted to build a pursuit-capable crew using available PORT, STBD, and Day Worker personnel.",
    requiredRoles,
    result.filledRoles,
    result.missingRoles,
    `<p><strong>Asset Check:</strong> ${assetCheck.message}</p>`
  );
};

window.generateRandomCrew = function() {
  const requiredRoles = [
    "Coxswain",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const roleChecks = {
    "Coxswain": member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"),
    "Engineer": member => memberHasQual(member, "ENG"),
    "Boarding / Crew Support": member => memberHasQual(member, "BO") || memberHasQual(member, "BTM"),
    "Additional Crew": member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "ENG") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
  };

  const result = buildCrewFromRoles(requiredRoles, roleChecks, true);

  renderCrewResult(
    "Random Crew Generator",
    "Watch Keeper randomly selected a crew from available PORT, STBD, and Day Worker personnel.",
    requiredRoles,
    result.filledRoles,
    result.missingRoles
  );
};

window.generateTrainingCrew = function() {
  const trainingType = safeValue("trainingType", "Boat Crew Training");
  const availableCrew = getAvailableCrewForGenerators();
  const breakIns = availableCrew.filter(member => memberHasQual(member, "B/I"));

  const selectedCrew = [];
  const filledRoles = {};

  function selectMember(role, condition) {
    const candidate = availableCrew.find(member =>
      !selectedCrew.includes(member) &&
      condition(member)
    );

    if (candidate) {
      selectedCrew.push(candidate);
      filledRoles[role] = candidate;
    }
  }

  if (trainingType === "Boat Crew Training") {
    selectMember("Mentor / Coxswain", member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"));
    selectMember("Break-In / Trainee", member => breakIns.includes(member));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "ENG") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

  if (trainingType === "Engineer Training") {
    selectMember("Engineer Mentor", member => memberHasQual(member, "ENG"));
    selectMember("Break-In / Trainee", member => breakIns.includes(member));
    selectMember("Coxswain", member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"));
    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

  if (trainingType === "Boarding Team Training") {
    selectMember("Boarding Mentor", member => memberHasQual(member, "BO") || memberHasQual(member, "BTM"));
    selectMember("Break-In / Trainee", member => breakIns.includes(member));
    selectMember("Coxswain", member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
  }

  if (trainingType === "Pursuit Training") {
    selectMember("Pursuit Coxswain Mentor", member => memberHasQual(member, "PCX"));
    selectMember("Pursuit Gunner Mentor", member => memberHasQual(member, "PG"));
    selectMember("Break-In / Trainee", member => breakIns.includes(member));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

  const missingTrainingPiece = !filledRoles["Break-In / Trainee"];
  const requiredRoles = Object.keys(filledRoles);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>${trainingType}</h4>
      <p>Watch Keeper generated a training crew using available PORT, STBD, and Day Worker personnel.</p>
    </div>

    <div class="scenario-readiness ${missingTrainingPiece ? "not-ready-panel" : "ready-panel"}">
      <h4>Training Crew ${missingTrainingPiece ? "Needs Review" : "Found"}</h4>

      ${
        requiredRoles.length === 0
          ? `<p>No suitable personnel found.</p>`
          : `
            <ul>
              ${requiredRoles.map(role => `
                <li>
                  <strong>${role}:</strong>
                  ${getFullDisplayName(filledRoles[role])}
                </li>
              `).join("")}
            </ul>
          `
      }

      ${
        missingTrainingPiece
          ? `<p class="member-notes">No B/I member was found for this training scenario.</p>`
          : `<p class="member-notes">Training crew includes a B/I member.</p>`
      }
    </div>
  `;
};

//--------------Leave ------------------

function renderLeave() {
  const leaveSummary = getLeaveSummary();
  pageTitle.textContent = "Leave";
  pageSubtitle.textContent = "Leave calendar, status board, and readiness impact";

  content.innerHTML = `
    <section class="dashboard-grid">
      <section class="cards">
        <div class="card">
          <p>Total Entries</p>
          <h3>${leaveSummary.total}</h3>
        </div>

        <div class="card warning">
          <p>Out Today</p>
          <h3>${leaveSummary.outToday}</h3>
        </div>

        <div class="card">
          <p>Out Selected Date</p>
          <h3>${leaveSummary.outSelectedDate}</h3>
        </div>

        <div class="card">
          <p>Upcoming 30 Days</p>
          <h3>${leaveSummary.upcoming}</h3>
        </div>
      </section>

      

      <div class="panel wide">
        <h3>Add Leave Entry</h3>

        <label>Member</label>
        <select id="leaveMember">
          ${
            crew.length === 0
              ? `<option value="">No personnel added.</option>`
              : crew.map((member, index) => `
                  <option value="${index}">
                    ${getFullDisplayName(member)} - ${member.section}
                  </option>
                `).join("")
          }
        </select>

        <label>Leave Type</label>
        <select id="leaveType">
          <option>Special Liberty</option>
          <option>Parental Leave</option>
          <option>Emergency Leave</option>
          <option>INCONUS Leave</option>
          <option>OCONUS Leave</option>
          <option>TDY</option>
          <option>School</option>
          <option>Medical</option>
        </select>

        <label>Start Date</label>
        <input id="leaveStartDate" type="date">

        <label>End Date</label>
        <input id="leaveEndDate" type="date">

        <label>Notes</label>
        <textarea id="leaveNotes"></textarea>

        <button class="primary-btn" onclick="addLeaveItem()">
          Add Leave Entry
        </button>
      </div>

      <div class="panel wide">
        <h3>Leave Calendar</h3>
        ${renderLeaveCalendarMini()}
      </div}

      <div class="panel wide">
        <h3>Availability Scenario</h3>

        <p class="member-notes">
          Temporarily mark personnel unavailable and check readiness impact.
        </p>

      </div>

      <div class="panel wide">
        <h3>Leave Status Board</h3>

        <details>
          <summary>
            View ${leaveItems.length} Leave / TDY / School / Medical Entries
          </summary>

          ${
            leaveItems.length === 0
              ? `<p class="empty-text">No leave entries added.</p>`
              : leaveItems.map(item => {
                  const member = crew[item.memberIndex];

                  return `
                    <div class="member-card">
                      <h4>${member ? getFullDisplayName(member) : "Unknown Member"}</h4>
                      <p>${item.leaveType}</p>
                      <p>${item.startDate} to ${item.endDate}</p>
                      ${item.notes ? `<p class="member-notes">${item.notes}</p>` : ""}

                      ${renderLeaveImpact(item)}

                      <button class="delete-btn" onclick="deleteLeaveItem(${item.id})">
                        Delete
                      </button>
                    </div>
                  `;
                }).join("")
          }
        </details>
      </div>

      <div class="panel wide">
        <h3>Leave for ${selectedLeaveDate}</h3>

        ${
          getLeaveItemsForDate(selectedLeaveDate).length === 0
            ? `<p class="empty-text">No leave entries for this date.</p>`
            : getLeaveItemsForDate(selectedLeaveDate).map(item => {
                const member = crew[item.memberIndex];

                return `
                  <div class="member-card">
                    <h4>${member ? getFullDisplayName(member) : "Unknown Member"}</h4>
                    <p>${item.leaveType}</p>
                    <p>${item.startDate} to ${item.endDate}</p>
                    ${item.notes ? `<p class="member-notes">${item.notes}</p>` : ""}
                    ${renderLeaveImpact(item)}
                  </div>
                `;
              }).join("")
        }
      </div>
    </section>
  `;
}

window.addLeaveItem = function() {
  const memberIndex = Number(document.getElementById("leaveMember").value);

  const startDate = document.getElementById("leaveStartDate").value;
  const endDate = document.getElementById("leaveEndDate").value;

  if (!startDate || !endDate) {
    document.getElementById("leaveStartDate").focus();
    return;
  }

  const existingOverlap = leaveItems.find(item =>
    item.memberIndex === memberIndex &&
    leaveRangesOverlap(startDate, endDate, item.startDate, item.endDate)
  );

  if (existingOverlap) {
    const continueSave = confirm(
      "This member already has a leave/TDY/school/medical entry during this date range. Save anyway?"
    );

    if (!continueSave) return;
  }

  leaveItems.push({
    id: Date.now(),
    memberIndex,
    leaveType: document.getElementById("leaveType").value,
    startDate,
    endDate,
    notes: document.getElementById("leaveNotes").value.trim()
  });

  saveLeaveItems();
  renderLeave();
};

window.deleteLeaveItem = function(id) {
  leaveItems = leaveItems.filter(item => item.id !== id);
  saveLeaveItems();
  renderLeave();
};

function doesLeaveAffectDate(leaveItem, dateString) {
  return dateString >= leaveItem.startDate && dateString <= leaveItem.endDate;
}

function getCrewWithLeaveApplied(dateString) {
  const simulatedCrew = JSON.parse(JSON.stringify(crew));

  leaveItems.forEach(item => {
    if (doesLeaveAffectDate(item, dateString)) {
      if (simulatedCrew[item.memberIndex]) {
        simulatedCrew[item.memberIndex].status = "Leave";
      }
    }
  });

  return simulatedCrew;
}

function checkReadinessFromLeaveDate(sectionName, dateString) {
  const simulatedCrew = getCrewWithLeaveApplied(dateString);

  return checkReadinessFromList(sectionName, simulatedCrew);
}

function renderLeaveImpact(item) {
  const member = crew[item.memberIndex];

  if (!member) {
    return `<p class="member-notes">Member not found.</p>`;
  }

  const section = member.section;
  const result = checkReadinessFromLeaveDate(section, item.startDate);

  if (result.ready) {
    return `
      <div class="scenario-readiness ready-panel">
        <strong>Impact:</strong> Green - No readiness impact detected.
      </div>
    `;
  }

  const standbyOptions = result.missing.flatMap(req =>
    getDayWorkerOptionsFromList(req, getCrewWithLeaveApplied(item.startDate))
  );

  if (standbyOptions.length > 0) {
    return `
      <div class="scenario-readiness warning">
        <strong>Impact:</strong> Amber - Standby coverage may be needed.
        <p class="member-notes">
          Missing: ${result.missing.join(", ")}
        </p>
      </div>
    `;
  }

  return `
    <div class="scenario-readiness not-ready-panel">
      <strong>Impact:</strong> Red - Readiness impact detected.
      <p class="member-notes">
        Missing: ${result.missing.join(", ")}
      </p>
    </div>
  `;
}

function getLeaveItemsForDate(dateString) {
  return leaveItems.filter(item =>
    dateString >= item.startDate &&
    dateString <= item.endDate
  );
}

function getLeaveCalendarMonthDays() {
  const year = calendarYear;
  const month = calendarMonth;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    year,
    month,
    startWeekday: firstDay.getDay(),
    daysInMonth: lastDay.getDate(),
    monthName: firstDay.toLocaleString("default", { month: "long" })
  };
}

function renderLeaveCalendarMini() {
  const data = getLeaveCalendarMonthDays();
  let cells = "";

  for (let i = 0; i < data.startWeekday; i++) {
    cells += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= data.daysInMonth; day++) {
    const date = new Date(data.year, data.month, day);

    const dateString =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    const leaveForDay = getLeaveItemsForDate(dateString);
    const section = getDutySectionForDate(dateString);

    cells += `
      <div
        class="calendar-cell ${section === "PORT" ? "port-day" : "stbd-day"}"
        onclick="selectLeaveDate('${dateString}')"
      >
        <strong>${day}</strong>

        ${
          leaveForDay.length === 0
            ? `<div class="calendar-crews"><span>No Leave</span></div>`
            : `
              <div class="calendar-crews">
                ${leaveForDay.slice(0, 2).map(item => {
                  const member = crew[item.memberIndex];

                  return `
                    <div class="calendar-crew-tag">
                      ${member ? member.lastName || "Member" : "Member"} - ${item.leaveType}
                    </div>
                  `;
                }).join("")}
                ${
                  leaveForDay.length > 2
                    ? `<div class="calendar-more">+${leaveForDay.length - 2} more</div>`
                    : ""
                }
              </div>
            `
        }
      </div>
    `;
  }

  return `
    <div class="calendar-header">
      <button class="secondary-btn" onclick="changeLeaveCalendarMonth(-1)">
        Previous
      </button>

      <h3>${data.monthName} ${data.year}</h3>

      <button class="secondary-btn" onclick="changeLeaveCalendarMonth(1)">
        Next
      </button>
    </div>

    <div class="calendar-grid">
      <div class="calendar-weekday">Sun</div>
      <div class="calendar-weekday">Mon</div>
      <div class="calendar-weekday">Tue</div>
      <div class="calendar-weekday">Wed</div>
      <div class="calendar-weekday">Thu</div>
      <div class="calendar-weekday">Fri</div>
      <div class="calendar-weekday">Sat</div>

      ${cells}
    </div>
  `;
}

window.changeLeaveCalendarMonth = function(direction) {
  calendarMonth += direction;

  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }

  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }

  renderLeaveCalendarMini();
};

window.selectLeaveDate = function(dateString) {
  selectedLeaveDate = dateString;
  renderLeave();
};

function getLeaveItemsForDashboardDate() {
  return getLeaveItemsForDate(dashboardDutyDate);
}

function getLeaveSummaryForDashboardDate() {
  const leaveForDate = getLeaveItemsForDashboardDate();

  return {
    total: leaveForDate.length,
    items: leaveForDate
  };
}

function isMemberOnLeaveForDate(memberIndex, dateString) {
  return leaveItems.some(item =>
    item.memberIndex === memberIndex &&
    dateString >= item.startDate &&
    dateString <= item.endDate
  );
}

function getPlannedCrewLeaveConflictsForDate(dateString) {
  const plans = plannedCrews.filter(plan => plan.dutyDate === dateString);
  const conflicts = [];

  plans.forEach(plan => {
    plan.crew.forEach(item => {
      const memberIndex = crew.indexOf(item.member);

      if (isMemberOnLeaveForDate(memberIndex, dateString)) {
        conflicts.push({
          plan,
          role: item.role,
          member: item.member
        });
      }
    });
  });

  return conflicts;
}

function leaveRangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function getLeaveSummary() {
  const today = getLocalDateString();

  const outToday = getLeaveItemsForDate(today).length;
  const outSelectedDate = getLeaveItemsForDate(selectedLeaveDate).length;

  const todayDate = new Date(`${today}T12:00:00`);
  const thirtyDaysFromNow = new Date(todayDate);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcoming = leaveItems.filter(item => {
    const start = new Date(`${item.startDate}T12:00:00`);
    return start >= todayDate && start <= thirtyDaysFromNow;
  }).length;

  return {
    total: leaveItems.length,
    outToday,
    outSelectedDate,
    upcoming
  };
}

// ---------- Mission Package Builder ----------
function buildMissionCrewForType(missionType) {
  const availableCrew = getAvailableCrewForGenerators();
  const selectedCrew = [];
  const filledRoles = {};
  const missingRoles = [];

  function selectMember(role, condition) {
    const candidate = availableCrew.find(member =>
      !selectedCrew.includes(member) &&
      condition(member)
    );

    if (candidate) {
      selectedCrew.push(candidate);
      filledRoles[role] = candidate;
    } else {
      missingRoles.push(role);
    }
  }

  if (missionType === "Pursuit") {
    selectMember("Pursuit Coxswain", member => memberHasQual(member, "PCX"));
    selectMember("Pursuit Gunner", member => memberHasQual(member, "PG"));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
    selectMember("Boarding / Crew Support", member => memberHasQual(member, "BO") || memberHasQual(member, "BTM"));
  } else if (missionType === "LE Boarding") {
    selectMember("Coxswain", member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
    selectMember("Boarding Officer", member => memberHasQual(member, "BO"));
    selectMember("Boarding Team Member", member => memberHasQual(member, "BTM") || memberHasQual(member, "BO"));
  } else {
    selectMember("Coxswain", member => memberHasQual(member, "PCX") || memberHasQual(member, "CX"));
    selectMember("Engineer", member => memberHasQual(member, "ENG"));
    selectMember("Crew / Support", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO")
    );
    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "ENG") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

  return {
    filledRoles,
    missingRoles
  };
}

function renderCrewSelectOptions(selectedIndex = "") {
  const availableCrew = getAvailableCrewForGenerators();

  return `
    <option value="">None selected</option>
    ${availableCrew.map(member => {
      const index = crew.indexOf(member);

      return `
        <option value="${index}" ${String(index) === String(selectedIndex) ? "selected" : ""}>
          ${getFullDisplayName(member)} - ${member.section}
        </option>
      `;
    }).join("")}
  `;
}

function renderQualifiedCrewOptions(roleType, missionDate, selectedIndex = "") {
  const availableCrew = getAvailableCrewForMissionDate(missionDate);

  const filteredCrew = availableCrew.filter(member => {
    if (roleType === "Coxswain") {
      return memberHasQual(member, "PCX") || memberHasQual(member, "CX");
    }

    if (roleType === "Engineer") {
      return memberHasQual(member, "ENG");
    }

    if (roleType === "BO") {
      return memberHasQual(member, "BO");
    }

    if (roleType === "BTM") {
      return memberHasQual(member, "BTM");
    }

    if (roleType === "Crewman") {
      return memberHasQual(member, "CR");
    }

    return true;
  });

  return `
    <option value="">None selected</option>
    ${filteredCrew.map(member => {
      const index = crew.indexOf(member);

      return `
        <option value="${index}" ${String(index) === String(selectedIndex) ? "selected" : ""}>
          ${getFullDisplayName(member)} - ${member.section}
        </option>
      `;
    }).join("")}
  `;
}

window.showMissionPackageBuilder = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Mission Package Builder</h4>
      <p>
        Build a mission package by selecting assets first. Each asset will get its own crew assignment.
      </p>
    </div>

    <div class="mission-package-form">
      <label>Mission Name</label>
      <input id="missionPackageName" placeholder="Example: Evening SAR Patrol">

      <label>Mission Date</label>
      <input id="missionPackageDate" type="date" value="${dashboardDutyDate}">

      <label>Mission Type</label>
      <select id="missionPackageType">
        <option>SAR</option>
        <option>LE Boarding</option>
        <option>Pursuit</option>
        <option>Training</option>
        <option>Patrol</option>
        <option>Other</option>
      </select>

      <label>Location / Area</label>
      <input id="missionPackageLocation" placeholder="Optional">

      <label>Select Mission Assets</label>
      <div class="checks mission-selected-assets">
        ${
          missionAssets.length === 0
            ? `<p>No FMC/PMC assets available.</p>`
            : missionAssets.map((asset, index) => `
                <label>
                  <input type="checkbox" value="${index}">
                  ${asset.name} - ${asset.type} - ${asset.status}
                </label>
              `).join("")
        }
      </div>

      <label>Mission Notes</label>
      <textarea id="missionPackageNotes" placeholder="Case details, patrol area, training objective, etc."></textarea>

      <label>Briefing Checklist</label>
      <div class="checks mission-checklist">
        <label><input type="checkbox" value="Weather checked"> Weather checked</label>
        <label><input type="checkbox" value="Comms checked"> Comms checked</label>
        <label><input type="checkbox" value="Asset status reviewed"> Asset status reviewed</label>
        <label><input type="checkbox" value="Crew qualifications reviewed"> Crew qualifications reviewed</label>
        <label><input type="checkbox" value="Risk assessment completed"> Risk assessment completed</label>
        <label><input type="checkbox" value="Command notified"> Command notified</label>
      </div>

      <button class="primary-btn scenario-btn" onclick="generateAssetSpecificMissionDraft()">
        Generate Asset Crew Planner
      </button>
    </div>
  `;
};

window.generateAssetSpecificMissionDraft = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAssetIndexes = [...document.querySelectorAll(".mission-selected-assets input:checked")]
    .map(input => Number(input.value));

  if (selectedAssetIndexes.length === 0) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select at least one mission asset.</p>
      </div>
    `);
    return;
  }

  const missionName = document.getElementById("missionPackageName").value.trim();
  const missionDate = document.getElementById("missionPackageDate").value || dashboardDutyDate;
  const missionType = document.getElementById("missionPackageType").value;
  const location = document.getElementById("missionPackageLocation").value.trim();
  const notes = document.getElementById("missionPackageNotes").value.trim();

  const checklist = [...document.querySelectorAll(".mission-checklist input:checked")]
    .map(input => input.value);

  const selectedAssets = selectedAssetIndexes
    .map(index => missionAssets[index])
    .filter(asset => asset);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report">
      <h3>Mission Asset Crew Planner</h3>

      <input type="hidden" id="draftMissionName" value="${missionName || "Unnamed Mission"}">
      <input type="hidden" id="draftMissionDate" value="${missionDate}">
      <input type="hidden" id="draftMissionType" value="${missionType}">
      <input type="hidden" id="draftMissionLocation" value="${location || ""}">
      <input type="hidden" id="draftSelectedAssetIndexes" value='${JSON.stringify(selectedAssetIndexes)}'>

      <div class="scenario-summary">
        <p><strong>Mission Name:</strong> ${missionName || "Unnamed Mission"}</p>
        <p><strong>Mission Date:</strong> ${missionDate}</p>
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Location:</strong> ${location || "Not listed"}</p>
      </div>

      ${selectedAssets.map((asset, assetCardIndex) => `
        <div class="scenario-summary mission-asset-card" data-asset-index="${selectedAssetIndexes[assetCardIndex]}">
          <h4>${asset.name} - ${asset.type} - ${asset.status}</h4>

          <label>Asset Mission / Purpose</label>
          <input
            class="asset-mission-purpose"
            value="${missionType}"
            placeholder="Example: SAR, Patrol, Training, Support"
          >

          <label>Coxswain / PCXC / CXC</label>
          <select class="asset-crew-coxswain">
            ${renderQualifiedCrewOptions("Coxswain", missionDate)}
          </select>

          <label>Engineer</label>
          <select class="asset-crew-engineer">
            ${renderQualifiedCrewOptions("Engineer", missionDate)}
          </select>

          <label>Boarding Officer</label>
          <select class="asset-crew-bo">
            ${renderQualifiedCrewOptions("BO", missionDate)}
          </select>

          <label>Boarding Team Member</label>
          <select class="asset-crew-btm">
            ${renderQualifiedCrewOptions("BTM", missionDate)}
          </select>

          <label>Crewman / Additional Crew</label>
          <select class="asset-crew-cr">
            ${renderQualifiedCrewOptions("Crewman", missionDate)}
          </select>
        </div>
      `).join("")}

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p id="draftMissionNotes">${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        <div id="draftChecklist">
          ${
            checklist.length === 0
              ? `<p>No checklist items selected.</p>`
              : `<ul>${checklist.map(item => `<li>${item}</li>`).join("")}</ul>`
          }
        </div>
      </div>

      <button class="primary-btn scenario-btn" onclick="finalizeAssetSpecificMissionPackage()">
        Finalize Mission Package
      </button>

      <button class="secondary-btn scenario-btn" onclick="showMissionPackageBuilder()">
        Back
      </button>
    </div>
  `;
};

window.finalizeAssetSpecificMissionPackage = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const missionName = document.getElementById("draftMissionName").value;
  const missionDate = document.getElementById("draftMissionDate").value;
  const missionType = document.getElementById("draftMissionType").value;
  const location = document.getElementById("draftMissionLocation").value;
  const notes = document.getElementById("draftMissionNotes").textContent;
  const checklistHTML = document.getElementById("draftChecklist").innerHTML;

  const assetCrews = [...document.querySelectorAll(".mission-asset-card")]
    .map(card => {
      const assetIndex = Number(card.dataset.assetIndex);
      const asset = missionAssets[assetIndex];

      if (!asset) return null;

      const purpose = card.querySelector(".asset-mission-purpose").value.trim();

      const crewAssignments = [
        {
          role: "Coxswain / PCXC / CXC",
          member: crew[Number(card.querySelector(".asset-crew-coxswain").value)]
        },
        {
          role: "Engineer",
          member: crew[Number(card.querySelector(".asset-crew-engineer").value)]
        },
        {
          role: "Boarding Officer",
          member: crew[Number(card.querySelector(".asset-crew-bo").value)]
        },
        {
          role: "Boarding Team Member",
          member: crew[Number(card.querySelector(".asset-crew-btm").value)]
        },
        {
          role: "Crewman / Additional Crew",
          member: crew[Number(card.querySelector(".asset-crew-cr").value)]
        }
      ].filter(item => item.member);

      return {
        asset,
        purpose,
        crew: crewAssignments
      };
    })
    .filter(item => item);

  const savedPackage = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionName,
    missionDate,
    missionType,
    location,
    assetCrews,
    notes,
    checklistHTML
  };

  missionPackages.push(savedPackage);
  saveMissionPackages();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report printable-report">
      <h3>${missionName || "Watch Keeper Mission Package"}</h3>

      <div class="scenario-summary">
        <p><strong>Mission Date:</strong> ${missionDate}</p>
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Location:</strong> ${location || "Not listed"}</p>
      </div>

      ${
        assetCrews.length === 0
          ? `<p class="empty-text">No asset crews assigned.</p>`
          : assetCrews.map(group => `
              <div class="scenario-summary">
                <h4>${group.asset.name} - ${group.asset.type} - ${group.asset.status}</h4>
                <p><strong>Purpose:</strong> ${group.purpose || missionType}</p>

                ${
                  group.crew.length === 0
                    ? `<p>No crew assigned.</p>`
                    : `
                      <ul>
                        ${group.crew.map(item => `
                          <li>
                            <strong>${item.role}:</strong>
                            ${getFullDisplayName(item.member)}
                          </li>
                        `).join("")}
                      </ul>
                    `
                }
              </div>
            `).join("")
      }

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p>${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        ${checklistHTML}
      </div>

      <button class="primary-btn scenario-btn no-print" onclick="window.print()">
        Print Mission Package
      </button>

      <button class="secondary-btn scenario-btn no-print" onclick="saveAssetSpecificMissionAsPlannedCrew(${savedPackage.id})">
        Save as Planned Crew
      </button>
    </div>
  `;
};

window.saveAssetSpecificMissionAsPlannedCrew = function(packageId) {
  const pkg = missionPackages.find(item => item.id === packageId);

  if (!pkg) return;

  const flattenedCrew = [];

  pkg.assetCrews.forEach(group => {
    group.crew.forEach(item => {
      flattenedCrew.push({
        role: `${group.asset.name} - ${item.role}`,
        member: item.member
      });
    });
  });

  const plannedCrew = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionType: pkg.missionType || "Mission Crew",
    asset: pkg.assetCrews[0]?.asset || {
      name: "Multi-Asset Mission",
      type: "Multiple Assets",
      status: "Planned"
    },
    additionalAssets: pkg.assetCrews.slice(1).map(group => group.asset),
    crew: flattenedCrew,
    notes: pkg.notes,
    checklistHTML: pkg.checklistHTML,
    dutyDate: pkg.missionDate || dashboardDutyDate
  };

  plannedCrews.push(plannedCrew);
  savePlannedCrews();

  document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
    <div class="scenario-summary no-print">
      <strong>Saved as planned crew for ${plannedCrew.dutyDate}.</strong>
    </div>
  `);
};

window.addMissionCrewReviewRow = function() {
  const container = document.getElementById("missionCrewReview");

  if (!container) return;

  container.insertAdjacentHTML("beforeend", `
    <div class="mission-crew-review-row">
      <input
        class="mission-review-role"
        placeholder="Role"
      >

      <select class="mission-review-member">
        ${renderCrewSelectOptions()}
      </select>

      <button class="delete-btn" onclick="this.closest('.mission-crew-review-row').remove()">
        Remove
      </button>
    </div>
  `);
};

window.finalizeManualMissionPackageFromReview = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAssetIndex = Number(document.getElementById("draftSelectedAssetIndex").value);
  const selectedAsset = missionAssets[selectedAssetIndex];

  const additionalAssetIndexes = document.getElementById("draftAdditionalAssetIndexes").value
    ? JSON.parse(document.getElementById("draftAdditionalAssetIndexes").value)
    : [];

  const additionalAssets = additionalAssetIndexes
    .map(index => missionAssets[index])
    .filter(asset => asset);

  const selectedRoles = [...document.querySelectorAll(".mission-crew-review-row")]
    .map(row => {
      const role = row.querySelector(".mission-review-role").value.trim();
      const memberIndex = Number(row.querySelector(".mission-review-member").value);
      const member = crew[memberIndex];

      return {
        role,
        member
      };
    })
    .filter(item => item.role && item.member);

  const missionName = document.getElementById("draftMissionName").value;
  const missionDate = document.getElementById("draftMissionDate").value;
  const missionType = document.getElementById("draftMissionType").value;
  const location = document.getElementById("draftMissionLocation").value;
  const notes = document.getElementById("draftMissionNotes").textContent;
  const checklistHTML = document.getElementById("draftChecklist").innerHTML;

  const savedPackage = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionName,
    missionDate,
    missionType,
    location,
    asset: selectedAsset,
    additionalAssets,
    crew: selectedRoles,
    notes,
    checklistHTML
  };

  missionPackages.push(savedPackage);
  saveMissionPackages();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report printable-report">
      <h3>${missionName || "Watch Keeper Mission Package"}</h3>
      <p><strong>Mission Date:</strong> ${missionDate}</p>
      <div class="scenario-summary">
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Mission Date:</strong> ${missionDate}</p>
        <p><strong>Location:</strong> ${location || "Not listed"}</p>
        <p><strong>Primary Asset:</strong> ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}</p>

        ${
          additionalAssets.length > 0
            ? `
              <p><strong>Additional Assets:</strong></p>
              <ul>
                ${additionalAssets.map(asset => `
                  <li>${asset.name} - ${asset.type} - ${asset.status}</li>
                `).join("")}
              </ul>
            `
            : ""
        }
      </div>

      <div class="scenario-summary">
        <h4>Final Crew Assignment</h4>

        ${
          selectedRoles.length === 0
            ? `<p>No crew assigned.</p>`
            : `
              <ul>
                ${selectedRoles.map(item => `
                  <li>
                    <strong>${item.role}:</strong>
                    ${getFullDisplayName(item.member)}
                  </li>
                `).join("")}
              </ul>
            `
        }
      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p>${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        ${checklistHTML}
      </div>

      <button class="primary-btn scenario-btn no-print" onclick="window.print()">
        Print Mission Package
      </button>

      <button class="secondary-btn scenario-btn no-print" onclick="saveAsPlannedCrew(${savedPackage.id})">
        Save as Planned Crew
      </button>
    </div>
  `;
};

window.generateManualMissionPackage = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAssetIndex = Number(
    document.getElementById("missionPackageAsset").value
  );

  const selectedAsset = missionAssets[selectedAssetIndex];

  if (!selectedAsset) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select an FMC or PMC asset.</p>
      </div>
    `);
    return;
  }

  const additionalAssetIndexes = [
    ...document.querySelectorAll(".mission-additional-assets input:checked")
  ]
    .map(input => Number(input.value))
    .filter(index => index !== selectedAssetIndex);

  const additionalAssets = additionalAssetIndexes
    .map(index => missionAssets[index])
    .filter(asset => asset);

  const missionName = document.getElementById("missionPackageName").value.trim();
  const missionDate = document.getElementById("missionPackageDate").value || dashboardDutyDate;
  const missionType = document.getElementById("missionPackageType").value;
  const location = document.getElementById("missionPackageLocation").value.trim();
  const notes = document.getElementById("missionPackageNotes").value.trim();

  const selectedRoles = [
    {
      role: "Coxswain / PCXC / CXC",
      member: crew[Number(document.getElementById("missionCrewCoxswain").value)]
    },
    {
      role: "Engineer",
      member: crew[Number(document.getElementById("missionCrewEngineer").value)]
    },
    {
      role: "Boarding Officer",
      member: crew[Number(document.getElementById("missionCrewBO").value)]
    },
    {
      role: "Boarding Team Member",
      member: crew[Number(document.getElementById("missionCrewBTM").value)]
    },
    {
      role: "Crewman / Additional Crew",
      member: crew[Number(document.getElementById("missionCrewExtra").value)]
    },
    {
      role: "Support Member 1",
      member: crew[Number(document.getElementById("missionSupportCrew1").value)]
    },
    {
      role: "Support Member 2",
      member: crew[Number(document.getElementById("missionSupportCrew2").value)]
    }
  ].filter(item => item.member);

  const checklist = [...document.querySelectorAll(".mission-checklist input:checked")]
    .map(input => input.value);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report">
      <h3>Mission Package Draft</h3>

      <input type="hidden" id="draftSelectedAssetIndex" value="${selectedAssetIndex}">
      <input type="hidden" id="draftAdditionalAssetIndexes" value='${JSON.stringify(additionalAssetIndexes)}'>
      <input type="hidden" id="draftMissionName" value="${missionName || "Unnamed Mission"}">
      <input type="hidden" id="draftMissionDate" value="${missionDate}">
      <input type="hidden" id="draftMissionType" value="${missionType}">
      <input type="hidden" id="draftMissionLocation" value="${location || ""}">

      <div class="scenario-summary">
        <p><strong>Mission Name:</strong> ${missionName || "Unnamed Mission"}</p>
        <p><strong>Mission Date:</strong> ${missionDate}</p>
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Location:</strong> ${location || "Not listed"}</p>

        <p>
          <strong>Primary Asset:</strong>
          ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}
        </p>

        ${
          additionalAssets.length > 0
            ? `
              <p><strong>Additional Assets:</strong></p>
              <ul>
                ${additionalAssets.map(asset => `
                  <li>${asset.name} - ${asset.type} - ${asset.status}</li>
                `).join("")}
              </ul>
            `
            : ""
        }
      </div>

      <div class="scenario-summary">
        <h4>Crew Assignment</h4>

        <div id="missionCrewReview">
          ${
            selectedRoles.length === 0
              ? ""
              : selectedRoles.map(item => `
                  <div class="mission-crew-review-row">
                    <input
                      class="mission-review-role"
                      value="${item.role}"
                    >

                    <select class="mission-review-member">
                      ${renderCrewSelectOptions(crew.indexOf(item.member))}
                    </select>

                    <button
                      class="delete-btn"
                      onclick="this.closest('.mission-crew-review-row').remove()"
                    >
                      Remove
                    </button>
                  </div>
                `).join("")
          }
        </div>

        ${
          selectedRoles.length === 0
            ? `<p class="empty-text">No crew assigned yet. Use Add Crew Member below.</p>`
            : ""
        }

        <button
          class="secondary-btn scenario-btn"
          onclick="addMissionCrewReviewRow()"
        >
          Add Crew Member
        </button>
      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p id="draftMissionNotes">${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>

        <div id="draftChecklist">
          ${
            checklist.length === 0
              ? `<p>No checklist items selected.</p>`
              : `<ul>${checklist.map(item => `<li>${item}</li>`).join("")}</ul>`
          }
        </div>
      </div>

      <button
        class="primary-btn scenario-btn"
        onclick="finalizeManualMissionPackageFromReview()"
      >
        Finalize Mission Package
      </button>

      <button
        class="secondary-btn scenario-btn"
        onclick="showMissionPackageBuilder()"
      >
        Back
      </button>
    </div>
  `;
};

window.finalizeManualMissionPackage = function(data) {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAsset = missionAssets[data.assetIndex];
  const additionalAssets = (data.additionalAssetIndexes || [])
    .map(index => missionAssets[index])
    .filter(asset => asset);

  const selectedRoles = data.crew.map(item => ({
    role: item.role,
    member: crew[item.memberIndex]
  })).filter(item => item.member);

  const supportRoles = (data.supportCrew || []).map(item => ({
    role: item.role,
    member: crew[item.memberIndex]
  })).filter(item => item.member);

  const checklistHTML =
    data.checklist.length === 0
      ? `<p>No checklist items selected.</p>`
      : `<ul>${data.checklist.map(item => `<li>${item}</li>`).join("")}</ul>`;

  const savedPackage = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionName: data.missionName,
    missionType: data.missionType,
    location: data.location,
    asset: selectedAsset,
    additionalAssets,
    crew: selectedRoles,
    supportCrew: supportRoles,
    notes: data.notes,
    checklistHTML
  };

  missionPackages.push(savedPackage);
  saveMissionPackages();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report printable-report">
      <h3>${data.missionName || "Watch Keeper Mission Package"}</h3>

      <div class="scenario-summary">

        <p>
          <strong>Mission Type:</strong>
          ${data.missionType}
        </p>

        <p>
          <strong>Location:</strong>
          ${data.location || "Not listed"}
        </p>

        <p>
          <strong>Primary Asset:</strong>
          ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}
        </p>

        ${
          additionalAssets.length > 0
            ? `
              <p><strong>Additional Assets:</strong></p>

              <ul>
                ${additionalAssets.map(asset => `
                  <li>
                    ${asset.name} - ${asset.type} - ${asset.status}
                  </li>
                `).join("")}
              </ul>
            `
            : ""
        }

      </div>

      <div class="scenario-summary">

        <h4>Final Crew Assignment</h4>

        ${
          selectedRoles.length === 0
            ? `<p>No crew assigned.</p>`
            : `
              <ul>
                ${selectedRoles.map(item => `
                  <li>
                    <strong>${item.role}:</strong>
                    ${getFullDisplayName(item.member)}
                  </li>
                `).join("")}
              </ul>
            `
        }

        ${
          supportRoles.length > 0
            ? `
              <h4>Support Crew</h4>

              <ul>
                ${supportRoles.map(item => `
                  <li>
                    <strong>${item.role}:</strong>
                    ${getFullDisplayName(item.member)}
                  </li>
                `).join("")}
              </ul>
            `
            : ""
        }

      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p>${data.notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        ${checklistHTML}
      </div>

      <button
        class="primary-btn scenario-btn"
        onclick="finalizeManualMissionPackageFromReview()"
      >
        Finalize Mission Package
      </button>

      <button class="primary-btn scenario-btn no-print" onclick="window.print()">
        Print Mission Package
      </button>

      <button class="secondary-btn scenario-btn no-print" onclick="saveAsPlannedCrew(${savedPackage.id})">
        Save as Planned Crew
      </button>
    </div>
  `;
};

window.generateMissionPackage = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  if (missionAssets.length === 0) {
    document.getElementById("scenarioResult").innerHTML = `
      <div class="scenario-readiness not-ready-panel">
        <h4>No Available Assets</h4>
        <p>No FMC or PMC assets are available.</p>
      </div>
    `;
    return;
  }

  const missionType = safeValue("missionPackageType", "SAR");
  const selectedAssetIndex = Number(safeValue("missionPackageAsset", "0"));
  const selectedAsset = missionAssets[selectedAssetIndex];
  const notes = safeValue("missionPackageNotes").trim();

  if (!selectedAsset) {
    document.getElementById("scenarioResult").innerHTML = `
      <div class="scenario-readiness not-ready-panel">
        <h4>No Asset Selected</h4>
        <p>Select an FMC or PMC asset before generating a mission package.</p>
      </div>
    `;
    return;
  }

  const checklist = [...document.querySelectorAll(".mission-checklist input:checked")]
    .map(input => input.value);

  const generatedCrew = buildMissionCrewForType(missionType);
  const availableCrew = getAvailableCrewForGenerators();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report">
      <h3>Mission Package Draft</h3>

      <div class="scenario-summary">
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Asset:</strong> ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}</p>
        ${
          selectedAsset.status === "PMC"
            ? `<p><strong>PMC Description:</strong> ${selectedAsset.pmcDescription || "No PMC description provided"}</p>`
            : ""
        }
      </div>

      <div class="scenario-readiness ${generatedCrew.missingRoles.length === 0 ? "ready-panel" : "not-ready-panel"}">
        <h4>Review / Override Crew</h4>

        ${Object.keys(generatedCrew.filledRoles).map(role => `
          <label>${role}</label>
          <select class="mission-role-select" data-role="${role}">
            ${availableCrew.map(member => `
              <option
                value="${crew.indexOf(member)}"
                ${crew.indexOf(member) === crew.indexOf(generatedCrew.filledRoles[role]) ? "selected" : ""}
              >
                ${getFullDisplayName(member)} - ${member.section}
              </option>
            `).join("")}
          </select>
        `).join("")}

        ${
          generatedCrew.missingRoles.length > 0
            ? `
              <h4>Missing Roles</h4>
              <div class="qual-row">
                ${generatedCrew.missingRoles.map(role => `<span class="badge missing-badge">${role}</span>`).join("")}
              </div>
            `
            : `<p class="member-notes">All mission crew roles filled. Review or override assignments before finalizing.</p>`
        }
      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p id="draftMissionNotes">${notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        <div id="draftChecklist">
          ${
            checklist.length === 0
              ? `<p>No checklist items selected.</p>`
              : `<ul>${checklist.map(item => `<li>${item}</li>`).join("")}</ul>`
          }
        </div>
      </div>

      <button class="primary-btn scenario-btn" onclick="finalizeMissionPackage('${missionType}', ${selectedAssetIndex})">
        Finalize Mission Package
      </button>
    </div>
  `;
};

window.finalizeMissionPackage = function(missionType, selectedAssetIndex) {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedAsset = missionAssets[selectedAssetIndex];

  if (!selectedAsset) return;

  const selectedRoles = [...document.querySelectorAll(".mission-role-select")].map(select => {
    const role = select.dataset.role;
    const member = crew[Number(select.value)];

    return {
      role,
      member
    };
  }).filter(item => item.member);

  const notes = document.getElementById("draftMissionNotes")?.textContent || "";
  const checklistHTML = document.getElementById("draftChecklist")?.innerHTML || "";

  const savedPackage = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionType,
    asset: selectedAsset,
    crew: selectedRoles.map(item => ({
      role: item.role,
      member: item.member
    })),
    notes,
    checklistHTML
  };

  missionPackages.push(savedPackage);
  saveMissionPackages();

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report printable-report">
      <h3>Watch Keeper Mission Package</h3>

      <div class="scenario-summary">
        <p><strong>Mission Type:</strong> ${missionType}</p>
        <p><strong>Asset:</strong> ${selectedAsset.name} - ${selectedAsset.type} - ${selectedAsset.status}</p>
        ${
          selectedAsset.status === "PMC"
            ? `<p><strong>PMC Description:</strong> ${selectedAsset.pmcDescription || "No PMC description provided"}</p>`
            : ""
        }
      </div>

      <div class="scenario-summary">
        <h4>Final Crew Assignment</h4>

        <ul>
          ${selectedRoles.map(item => `
            <li>
              <strong>${item.role}:</strong>
              ${getFullDisplayName(item.member)}
            </li>
          `).join("")}
        </ul>
      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p>${notes}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        ${checklistHTML}
      </div>

      <button class="primary-btn scenario-btn no-print" onclick="window.print()">
        Print Mission Package
      </button>

      <button class="secondary-btn scenario-btn no-print" onclick="saveAsPlannedCrew(${savedPackage.id})">
        Save as Planned Crew
      </button>
    </div>
  `;
};

window.saveAsPlannedCrew = function(packageId) {
  pendingPlannedCrewPackageId = packageId;

  const today = new Date().toISOString().slice(0, 10);

  const existingBox = document.getElementById("plannedCrewDateBox");
  if (existingBox) existingBox.remove();

  document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
    <div class="scenario-summary no-print" id="plannedCrewDateBox">
      <h4>Save as Planned Crew</h4>

      <label>Duty Date</label>
      <input id="plannedCrewDutyDate" type="date" value="${today}">

      <button class="primary-btn scenario-btn" onclick="confirmSavePlannedCrew()">
        Confirm Save
      </button>

      <button class="secondary-btn scenario-btn" onclick="cancelSavePlannedCrew()">
        Cancel
      </button>
    </div>
  `);

  setTimeout(() => {
    const dateInput = document.getElementById("plannedCrewDutyDate");
    if (dateInput) dateInput.focus();
  }, 100);
};

window.confirmSavePlannedCrew = function() {
  const pkg = missionPackages.find(item => item.id === pendingPlannedCrewPackageId);

  if (!pkg) {
    return;
  }

  const dutyDate = safeValue("plannedCrewDutyDate");

  if (!dutyDate) {
    const dateInput = document.getElementById("plannedCrewDutyDate");
    if (dateInput) dateInput.focus();
    return;
  }

  const plannedCrew = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    missionType: pkg.missionType,
    asset: pkg.asset,
    crew: pkg.crew,
    notes: pkg.notes,
    checklistHTML: pkg.checklistHTML,
    dutyDate
  };

  plannedCrews.push(plannedCrew);
  savePlannedCrews();

  pendingPlannedCrewPackageId = null;

  const box = document.getElementById("plannedCrewDateBox");
  if (box) box.remove();

  document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
    <div class="scenario-summary no-print">
      <strong>Saved as planned crew for ${dutyDate}.</strong>
    </div>
  `);
};

window.cancelSavePlannedCrew = function() {
  pendingPlannedCrewPackageId = null;

  const box = document.getElementById("plannedCrewDateBox");
  if (box) box.remove();
};

window.showSavedMissionPackages = function() {
  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Saved Mission Packages</h4>
      <p>View, print, or delete saved mission packages.</p>
    </div>

    ${
      missionPackages.length === 0
        ? `<p class="empty-text">No saved mission packages.</p>`
        : missionPackages
            .slice()
            .reverse()
            .map(pkg => `
              <div class="member-card">
                <div class="member-header">
                  <div>
                    <h4>${pkg.missionType} - ${pkg.asset.name}</h4>
                    <p>${new Date(pkg.createdAt).toLocaleString()}</p>
                    <p>${pkg.asset.type} | ${pkg.asset.status}</p>
                  </div>

                  <div class="member-actions">
                    <button class="action-btn" onclick="viewMissionPackage(${pkg.id})">View</button>
                    <button class="action-btn delete-btn" onclick="deleteMissionPackage(${pkg.id})">Delete</button>
                  </div>
                </div>
              </div>
            `).join("")
    }
  `;
};

window.viewMissionPackage = function(id) {
  const pkg = missionPackages.find(item => item.id === id);
  if (!pkg) return;

  document.getElementById("scenarioResult").innerHTML = `
    <div class="mission-package-report printable-report">
      <h3>Watch Keeper Mission Package</h3>

      <div class="scenario-summary">
        <p><strong>Mission Type:</strong> ${pkg.missionType}</p>
        <p><strong>Asset:</strong> ${pkg.asset.name} - ${pkg.asset.type} - ${pkg.asset.status}</p>
        <p><strong>Created:</strong> ${new Date(pkg.createdAt).toLocaleString()}</p>
      </div>

      <div class="scenario-summary">
        <h4>Crew Assignment</h4>

        ${
          selectedRoles.length === 0
            ? `<p class="empty-text">No crew assigned.</p>`
            : `
              <ul>
                ${selectedRoles.map(item => `
                  <li>
                    <strong>${item.role}:</strong>
                    ${getFullDisplayName(item.member)}
                  </li>
                `).join("")}
              </ul>
            `
        }

        ${
          supportRoles.length > 0
            ? `
              <h4>Support Crew</h4>

              <ul>
                ${supportRoles.map(item => `
                  <li>
                    <strong>${item.role}:</strong>
                    ${getFullDisplayName(item.member)}
                  </li>
                `).join("")}
              </ul>
            `
            : ""
        }

      </div>

      <div class="scenario-summary">
        <h4>Mission Notes</h4>
        <p>${pkg.notes || "No notes entered."}</p>
      </div>

      <div class="scenario-summary">
        <h4>Briefing Checklist</h4>
        ${pkg.checklistHTML}
      </div>

      <button class="primary-btn scenario-btn no-print" onclick="window.print()">
        Print Mission Package
      </button>

      <button class="secondary-btn scenario-btn no-print" onclick="showSavedMissionPackages()">
        Back to Saved Packages
      </button>
    </div>
  `;
};

window.deleteMissionPackage = function(id) {
  missionPackages = missionPackages.filter(pkg => pkg.id !== id);
  saveMissionPackages();
  showSavedMissionPackages();
};

// ---------- Multi-Asset Planner ----------
window.showMultiAssetPlanner = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Multi-Asset Mission Planner</h4>
      <p>Select which FMC/PMC assets to include in the mission.</p>
    </div>

    ${
      missionAssets.length === 0
        ? `
          <div class="scenario-readiness not-ready-panel">
            <p>No FMC or PMC assets are available.</p>
          </div>
        `
        : `
          <div class="scenario-personnel-list compact">
            ${missionAssets.map((asset, index) => `
              <label class="scenario-person">
                <input type="checkbox" class="mission-asset-check" value="${index}">
                <span>
                  ${asset.name} - ${asset.type} - ${asset.status}
                  ${asset.status === "PMC" ? `(${asset.pmcDescription || "No PMC description"})` : ""}
                </span>
              </label>
            `).join("")}
          </div>

          <button class="primary-btn scenario-btn" onclick="runSelectedMultiAssetMission()">
            Run Multi-Asset Mission
          </button>
        `
    }
  `;
};

window.runSelectedMultiAssetMission = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  const selectedIndexes = [...document.querySelectorAll(".mission-asset-check:checked")]
    .map(input => Number(input.value));

  if (selectedIndexes.length === 0) {
    document.getElementById("scenarioResult").insertAdjacentHTML("beforeend", `
      <div class="scenario-readiness not-ready-panel">
        <p>Select at least one asset.</p>
      </div>
    `);
    return;
  }

  const selectedAssets = selectedIndexes.map(index => missionAssets[index]);
  generateMultiAssetMission(selectedAssets);
};

window.generateMultiAssetMission = function(selectedAssets = null) {
  const missionAssets = selectedAssets || assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  if (missionAssets.length === 0) {
    document.getElementById("scenarioResult").innerHTML = `
      <div class="scenario-readiness not-ready-panel">
        <h4>Multi-Asset Mission</h4>
        <p>No FMC or PMC assets are available.</p>
      </div>
    `;
    return;
  }

  const availableCrew = getAvailableCrewForGenerators();
  const assignedMembers = [];
  const assetCrews = [];

  function selectMember(condition) {
    const candidate = availableCrew.find(member =>
      !assignedMembers.includes(member) &&
      condition(member)
    );

    if (candidate) {
      assignedMembers.push(candidate);
      return candidate;
    }

    return null;
  }

  missionAssets.forEach(asset => {
    const requiredCrewSize = Number(asset.crewSize || 4);
    const missionProfile = asset.missionProfile || "SAR";

    const roles = [];

    if (missionProfile === "Pursuit" && asset.pursuit === "Yes") {
      roles.push("PCX", "PG", "ENG", "BO");
    } else if (missionProfile === "LE Boarding") {
      roles.push("CX", "ENG", "BO", "BTM");
    } else {
      roles.push("CX", "ENG", "BO", "CR");
    }

    while (roles.length < requiredCrewSize) {
      roles.push("CR");
    }

    const filledRoles = {};
    const missingRoles = [];

    roles.forEach((role, roleIndex) => {
      const roleKey = `${role} ${roleIndex + 1}`;

      const member = selectMember(candidate => {
        if (role === "CX") {
          return memberHasQual(candidate, "PCX") || memberHasQual(candidate, "CX");
        }

        if (role === "CR") {
          return memberHasQual(candidate, "CR");
        }

        return memberHasQual(candidate, role);
      });

      if (member) {
        filledRoles[roleKey] = member;
      } else {
        missingRoles.push(role);
      }
    });

    assetCrews.push({
      asset,
      missionProfile,
      filledRoles,
      missingRoles
    });
  });

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Multi-Asset Mission Planner</h4>
      <p>
        Watch Keeper attempted to crew the selected assets without assigning the same member twice.
      </p>
    </div>

    ${assetCrews.map(result => `
      <div class="scenario-readiness ${result.missingRoles.length === 0 ? "ready-panel" : "not-ready-panel"}">
        <h4>${result.asset.name} - ${result.asset.type}</h4>

        <p>
          <strong>Status:</strong> ${result.asset.status}
          ${result.asset.status === "PMC" ? ` - ${result.asset.pmcDescription || "No PMC description provided"}` : ""}
        </p>

        <p><strong>Mission Profile:</strong> ${result.missionProfile}</p>

        <p><strong>Crew Assignment:</strong></p>

        <ul>
          ${
            Object.keys(result.filledRoles).map(role => `
              <li>
                <strong>${role}:</strong>
                ${getFullDisplayName(result.filledRoles[role])}
              </li>
            `).join("") || "<li>No roles filled.</li>"
          }
        </ul>

        ${
          result.missingRoles.length === 0
            ? `<p class="member-notes">All required roles filled.</p>`
            : `
              <p><strong>Missing Roles:</strong></p>
              <div class="qual-row">
                ${result.missingRoles.map(role => `<span class="badge missing-badge">${role}</span>`).join("")}
              </div>
            `
        }
      </div>
    `).join("")}
  `;
};

// ---------- Settings ----------
function renderSettings() {
  pageTitle.textContent = "Settings";
  pageSubtitle.textContent = "Manage duty rotation and saved Watch Keeper data";

  content.innerHTML = `
    <section class="dashboard-grid">
      <div class="panel">
        <h3>Duty Rotation Settings</h3>

        <label>Current Duty Section</label>
        <select id="rotationCurrentSection">
          <option ${rotationSettings.currentSection === "PORT" ? "selected" : ""}>PORT</option>
          <option ${rotationSettings.currentSection === "STBD" ? "selected" : ""}>STBD</option>
        </select>

        <label>Current Duty Start Date</label>
        <input id="rotationStartDate" type="date" value="${rotationSettings.dutyStartDate}">

        <label>Duty Pattern</label>
        <select id="rotationPattern">
          <option ${rotationSettings.pattern === "2-on-2-off" ? "selected" : ""}>2-on-2-off</option>
        </select>

        <button class="primary-btn settings-btn" onclick="saveDutyRotationSettings()">
          Save Duty Rotation
        </button>
      </div>

      <div class="panel">
        <h3>Personnel Data</h3>

        <p class="member-notes">
          This removes all saved personnel from this device only.
        </p>

        <button class="danger-btn settings-btn" onclick="wipeAllPersonnel()">
          Wipe All Saved Personnel
        </button>
      </div>

      <div class="panel">
        <h3>Mission Package Data</h3>

        <p class="member-notes">
          This removes saved mission packages and planned crews from this device only.
        </p>

        <button class="danger-btn settings-btn" onclick="wipeMissionData()">
          Wipe Mission Package Data
        </button>
      </div>
    </section>
  `;
}

window.saveDutyRotationSettings = function() {
  rotationSettings.currentSection = safeValue("rotationCurrentSection", "PORT");
  rotationSettings.dutyStartDate = safeValue("rotationStartDate", new Date().toISOString().slice(0, 10));
  rotationSettings.pattern = safeValue("rotationPattern", "2-on-2-off");

  saveRotationSettings();
  dashboardSectionView = null;
  renderSettings();
};

window.wipeAllPersonnel = function() {
  crew = [];
  saveCrew();
  renderSettings();
};

window.wipeMissionData = function() {
  missionPackages = [];
  plannedCrews = [];
  saveMissionPackages();
  savePlannedCrews();
  renderSettings();
};

// ---------- Save Member ----------
function saveMemberFromModal(keepOpen = false) {
  const rank = safeValue("memberRank").trim();
  const firstName = safeValue("memberFirstName").trim();
  const middleInitial = safeValue("memberMiddleInitial").trim().replace(".", "");
  const lastName = safeValue("memberLastName").trim();
  const title = getMemberTitle();
  const dept = safeValue("memberDept", "Deck");
  const section = safeValue("memberSection", "PORT");
  const status = safeValue("memberStatus", "Available");
  const lossDate = safeValue("lossDate");
  const lossReason = safeValue("lossReason", "None");
  const notes = safeValue("memberNotes").trim();
  const emplid = safeValue("memberEmplid").trim();
  const arrivalDate = safeValue("memberArrivalDate");
  const swapDate = safeValue("memberSwapDate");

  let quals = getSelectedModalQuals();
  const collaterals = getSelectedModalCollaterals();

  if (quals.includes("PCX")) {
    quals = quals.filter(q => q !== "CX");
  }

  if (!rank || !lastName) {
    showMemberError("Enter at least rank and last name.", "memberRank");
    return;
  }

  if (isDuplicateMember(rank, firstName, middleInitial, lastName, editingIndex)) {
    showMemberError("This person already appears to be in the roster.", "memberRank");
    return;
  }

  const memberData = {
    rank,
    firstName,
    middleInitial,
    lastName,
    title,
    dept,
    section,
    status,
    quals,
    collaterals,
    lossDate,
    lossReason,
    emplid,
    arrivalDate,
    swapDate,
    notes,
    notesHistory: editingIndex !== null
    ? (crew[editingIndex].notesHistory || [])
    : [],
  };

  if (editingIndex === null) {
    crew.push(memberData);
  } else {
    crew[editingIndex] = memberData;
  }

  saveCrew();

  if (keepOpen) {
    clearModal();
    modal.classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("memberRank").focus();
    }, 100);
  } else {
    closeMemberModal();
  }
}

// ---------- Event Listeners ----------
function setupEventListeners() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      updateTopbarButton(page);

      if (page === "dashboard") renderDashboard();
      if (page === "crew") renderCrewRoster();
      if (page === "worklist") renderWorkList();
      if (page === "assets") renderAssets();
      if (page === "sections") renderDutySections();
      if (page === "readiness") renderReadinessCheck();
      if (page === "scenarios") renderScenarioBuilder();
      if (page === "qualifications") renderQualifications();
      if (page === "smart-settings") renderSmartAssignmentSettings();
      if (page === "settings") renderSettings();
      if (page === "calendar") renderCalendar();
      if (page === "leave") renderLeave();
    });
  });

  if (topbarButton) {
    topbarButton.onclick = openMemberModal;
  }

  const closeMemberButton = document.getElementById("closeModal");
  if (closeMemberButton) {
    closeMemberButton.addEventListener("click", closeMemberModal);
  }

  const saveMemberButton = document.getElementById("saveMember");
  if (saveMemberButton) {
    saveMemberButton.addEventListener("click", () => {
      saveMemberFromModal(false);
    });
  }

  const saveAndAddAnotherButton = document.getElementById("saveAndAddAnother");
  if (saveAndAddAnotherButton) {
    saveAndAddAnotherButton.addEventListener("click", () => {
      saveMemberFromModal(true);
    });
  }


  const smartAssignButton = document.getElementById("smartAssignButton");
  if (smartAssignButton) {
    smartAssignButton.addEventListener("click", runModalSmartAssignment);
  }

  const closeAssetButton = document.getElementById("closeAssetModal");
  if (closeAssetButton) {
    closeAssetButton.addEventListener("click", closeAssetModal);
  }

  const saveAssetButton = document.getElementById("saveAsset");
  if (saveAssetButton) {
    saveAssetButton.addEventListener("click", addAsset);
  }

  const assetStatus = document.getElementById("assetStatus");
  if (assetStatus) {
    assetStatus.addEventListener("change", () => {
      const status = safeValue("assetStatus", "FMC");
      if (status === "PMC") {
        showElement("pmcBox");
      } else {
        hideElement("pmcBox");
      }
    });
  }

  document.querySelectorAll('.checks input[value="PCX"]').forEach(pcxBox => {
    pcxBox.addEventListener("change", () => {
      if (pcxBox.checked) {
        document.querySelectorAll('.checks input[value="CX"]').forEach(cxBox => {
          cxBox.checked = false;
        });
      }
    });
  });

  document.querySelectorAll('.checks input[value="CX"]').forEach(cxBox => {
    cxBox.addEventListener("change", () => {
      if (cxBox.checked) {
        document.querySelectorAll('.checks input[value="PCX"]').forEach(pcxBox => {
          pcxBox.checked = false;
        });
      }
    });
  });
}

// ---------- Initial Load ----------
setupEventListeners();
updateTopbarButton("dashboard");
renderDashboard();
