let editingIndex = null;
let editingAssetIndex = null;

let crew = JSON.parse(localStorage.getItem("watchKeeperCrew")) || [];
let missionPackages = JSON.parse(localStorage.getItem("wathcKeeperMissionPackages")) || [];

const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const modal = document.getElementById("memberModal");
const modalTitle = document.getElementById("modalTitle");
const modalSmartResult = document.getElementById("modalSmartResult");

const trackedQuals = ["OOD", "WCH", "PCX", "CX", "PG", "ENG", "BO", "BTM", "CR", "B/I"];
const readinessRequirements = ["OOD", "PCX", "PG", "ENG", "BO", "BTM"];
const topbarButton = document.getElementById("openAddMember");
const assetModal = document.getElementById("assetModal");
const assetModalTitle = document.getElementById("assetModalTitle");

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

function saveSmartSettings() {
  localStorage.setItem("watchKeeperSmartSettings", JSON.stringify(smartSettings));
}

function saveCrew() {
  localStorage.setItem("watchKeeperCrew", JSON.stringify(crew));
}

let assets = JSON.parse(localStorage.getItem("watchKeeperAssets")) || [];

function saveAssets() {
  localStorage.setItem("watchKeeperAssets", JSON.stringify(assets));
}

function saveMissionPackages() {
  localStorage.setItem("watchKeeperMissionPackages", JSON.stringify(missionPackages));
}

function getFullDisplayName(member) {
  if (member.lastName || member.firstName || member.rank) {
    const middle = member.middleInitial ? `${member.middleInitial}.` : "";
    return `${member.lastName || ""}, ${member.firstName || ""} ${middle} - ${member.rank || ""}`.trim();
  }

  return member.name || "Unnamed Member";
}

const rankOrder = [
  "CO", "CDR", "LCDR", "LT", "LTJG", "ENS",
  "CWO4", "CWO3", "CWO2",
  "MCPO", "SCPO", "CPO",
  "PO1", "BM1", "MK1", "ME1", "OS1", "YN1", "SK1", "DC1", "EM1", "ET1", "IT1",
  "PO2", "BM2", "MK2", "ME2", "OS2", "YN2", "SK2", "DC2", "EM2", "ET2", "IT2",
  "PO3", "BM3", "MK3", "ME3", "OS3", "YN3", "SK3", "DC3", "EM3", "ET3", "IT3",
  "SN", "FN", "AN", "SA", "FA", "AA", "SR"
];

function updateTopbarButton(page) {
  if (page === "dashboard" || page === "crew") {
    topbarButton.style.display = "block";
    topbarButton.textContent = "+ Add Member";
    topbarButton.onclick = () => {
      clearModal();
      modal.classList.remove("hidden");
      document.querySelector(".modal-card").scrollTop = 0;
    };

    } else if (page === "assets") {
      topbarButton.style.display = "block";
      topbarButton.textContent = "+ Add Asset";
      topbarButton.onclick = () => {
        clearAssetModal();
        assetModal.classList.remove("hidden");

        const modalCard = assetModal.querySelector(".modal-card");
        modalCard.scrollTop = 0;

        setTimeout(() => {
          document.getElementById("assetName").focus();
        }, 50);
    };
  } else {
    topbarButton.style.display = "none";
  }
}

function getRankValue(rank) {
  const normalizedRank = (rank || "").toUpperCase();
  const index = rankOrder.indexOf(normalizedRank);

  return index === -1 ? 999 : index;
}

function sortMembers(members) {
  return [...members].sort((a, b) => {
    const rankCompare = getRankValue(a.rank) - getRankValue(b.rank);

    if (rankCompare !== 0) {
      return rankCompare;
    }

    return (a.lastName || "").localeCompare(b.lastName || "");
  });
}

function getGroup(value) {
  return sortMembers(crew.filter(member => member.section === value));
}

function getAvailableGroup(value) {
  return sortMembers(crew.filter(member => member.section === value && member.status === "Available"));
}

function getSelectedModalQuals() {
  return [...document.querySelectorAll(".checks input:checked")]
    .filter(input => trackedQuals.includes(input.value))
    .map(input => input.value);
}

function getSelectedModalCollaterals() {
  const selected = [...document.querySelectorAll(".checks input:checked")]
    .filter(input => !trackedQuals.includes(input.value))
    .map(input => input.value);

  const customCollateral = document.getElementById("customCollateral").value.trim();

  if (selected.includes("Custom") && customCollateral) {
    return selected.filter(item => item !== "Custom").concat(customCollateral);
  }

  return selected.filter(item => item !== "Custom");
}

function getMemberTitle() {
  const title = document.getElementById("memberTitle").value;
  const customTitle = document.getElementById("customTitle").value.trim();

  if (title === "Custom") return customTitle;
  if (title === "None") return "";

  return title;
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
  if (!member.quals) return false;

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

function recommendSectionForNewMember(dept, quals) {
  const port = getGroup("PORT");
  const stbd = getGroup("STBD");

  let portScore = 0;
  let stbdScore = 0;

  const portReasons = [];
  const stbdReasons = [];
  const neutralReasons = [];

  if (port.length < stbd.length) {
    portScore += smartSettings.personnelWeight;
    portReasons.push("PORT currently has fewer total personnel.");
  } else if (stbd.length < port.length) {
    stbdScore += smartSettings.personnelWeight;
    stbdReasons.push("STBD currently has fewer total personnel.");
  } else {
    neutralReasons.push("PORT and STBD have equal personnel counts.");
  }

  const portDept = countDept(port, dept);
  const stbdDept = countDept(stbd, dept);

  if (portDept < stbdDept) {
    portScore += smartSettings.departmentWeight;
    portReasons.push(`PORT currently has fewer ${dept} personnel.`);
  } else if (stbdDept < portDept) {
    stbdScore += smartSettings.departmentWeight;
    stbdReasons.push(`STBD currently has fewer ${dept} personnel.`);
  } else {
    neutralReasons.push(`${dept} staffing is currently even.`);
  }

  quals.forEach(qual => {
    const portQual = countQual(port, qual);
    const stbdQual = countQual(stbd, qual);

    const criticalWeight = smartSettings.criticalQualWeights[qual] || smartSettings.qualificationWeight;

    if (portQual < stbdQual) {
      portScore += criticalWeight;
      portReasons.push(`PORT currently has fewer ${qual}-qualified members.`);
    } else if (stbdQual < portQual) {
      stbdScore += criticalWeight;
      stbdReasons.push(`STBD currently has fewer ${qual}-qualified members.`);
    }
  });

  const recommendation = portScore >= stbdScore ? "PORT" : "STBD";

  const reasons =
    recommendation === "PORT"
      ? portReasons
      : stbdReasons;

  if (reasons.length === 0) {
    reasons.push(`${recommendation} selected as the default because no major imbalance was detected.`);
  }

  return {
    recommendation,
    portScore,
    stbdScore,
    reasons,
    neutralReasons
  };
}

function runModalSmartAssignment() {
  const dept = document.getElementById("memberDept").value;
  const quals = getSelectedModalQuals();

  const result = recommendSectionForNewMember(dept, quals);

  document.getElementById("memberSection").value = result.recommendation;

  const reasonList = smartSettings.showRecommendationReasons !== false
    ? `
      <h4>Reason</h4>
      <ul>
        ${result.reasons.map(reason => `<li>${reason}</li>`).join("")}
      </ul>
    `
    : "";

  modalSmartResult.classList.remove("hidden");
  modalSmartResult.innerHTML = `
    <strong>Recommended Assignment: ${result.recommendation}</strong>

    ${reasonList}

    <p class="member-notes">
      Recommendation is based on the current Smart Assignment mode: ${smartSettings.philosophy}.
    </p>
  `;
}

window.saveSmartAssignmentSettings = function() {
  smartSettings.philosophy = document.getElementById("philosophy").value;
  smartSettings.futureLossPrediction = document.getElementById("futureLossPrediction").checked;
  smartSettings.showRecommendationReasons = document.getElementById("showRecommendationReasons").checked;

  if (smartSettings.philosophy === "Custom") {
    smartSettings.personnelBalance = document.getElementById("personnelBalance").checked;
    smartSettings.personnelWeight = Number(document.getElementById("personnelWeight").value);

    smartSettings.qualificationBalance = document.getElementById("qualificationBalance").checked;
    smartSettings.qualificationWeight = Number(document.getElementById("qualificationWeight").value);

    smartSettings.departmentBalance = document.getElementById("departmentBalance").checked;
    smartSettings.departmentWeight = Number(document.getElementById("departmentWeight").value);

    smartSettings.leadershipBalance = document.getElementById("leadershipBalance").checked;
    smartSettings.leadershipWeight = Number(document.getElementById("leadershipWeight").value);

    smartSettings.rankBalance = document.getElementById("rankBalance").checked;
    smartSettings.rankWeight = Number(document.getElementById("rankWeight").value);

    smartSettings.breakInMentorPriority = document.getElementById("breakInMentorPriority").checked;
    smartSettings.breakInWeight = Number(document.getElementById("breakInWeight").value);

    Object.keys(smartSettings.criticalQualWeights).forEach(qual => {
      smartSettings.criticalQualWeights[qual] = Number(document.getElementById(`qualWeight_${qual}`).value);
    });
  }

  saveSmartSettings();
  alert("Smart Assignment settings saved.");
};

window.applyPhilosophyPreset = function() {
  const philosophy = document.getElementById("philosophy").value;

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

window.previewSmartMode = function() {
  const mode = document.getElementById("philosophy").value;
  document.getElementById("modeDescription").textContent = getSmartModeDescription(mode);
};

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

function getDashboardQuals(member) {
  const quals = [];

  if (member.quals?.includes("OOD")) {
    quals.push("OOD");
  }

  if (member.quals?.includes("PCX")) {
    quals.push("PCX");
  } else if (member.quals?.includes("CX")) {
    quals.push("CX");
  }

  if (member.quals?.includes("ENG")) {
    quals.push("ENG");
  }

  if (member.quals?.includes("BO")) {
    quals.push("BO");
  }

  if (member.quals?.includes("PG")) {
    quals.push("PG");
  }

  return quals.join(" | ");
}

function getDashboardDisplay(member) {
  const rank = member.rank || "";
  const lastName = member.lastName || "";

  const pieces = [`${rank} ${lastName}`];

  if (member.title) {
    pieces.push(member.title);
  }

  const importantQuals = getDashboardQuals(member);

  if (importantQuals) {
    pieces.push(importantQuals);
  }

  return pieces.join(" - ");
}

updateTopbarButton("dashboard");

function renderDashboard() {
  const portCrew = getGroup("PORT");
  const stbdCrew = getGroup("STBD");
  const dayWorkers = getGroup("Day Worker");
  const reservists = getGroup("Reservist");
  const tdyToStation = getGroup("TDY to Station");
  const upcomingLosses = getUpcomingLosses();

  pageTitle.textContent = "Dashboard";
  pageSubtitle.textContent = "Station readiness overview";

  content.innerHTML = `
    <section class="cards">
      <div class="card">
        <p>Total Personnel</p>
        <h3>${crew.length}</h3>
      </div>

      <div class="card port-card">
        <p>PORT</p>
        <h3>${portCrew.length}</h3>
      </div>

      <div class="card stbd-card">
        <p>STBD</p>
        <h3>${stbdCrew.length}</h3>
      </div>

      <div class="card">
        <p>Day Workers</p>
        <h3>${dayWorkers.length}</h3>
      </div>
    </section>

    <section class="dashboard-grid">
      ${renderMiniGroupPanel("PORT Section", portCrew, "port-panel")}
      ${renderMiniGroupPanel("STBD Section", stbdCrew, "stbd-panel")}
      ${renderMiniGroupPanel("Day Workers", dayWorkers, "")}
      ${renderMiniGroupPanel("Reservists", reservists, "")}
      ${renderMiniGroupPanel("TDY to Station", tdyToStation, "")}

      <div class="panel wide">
        <h3>Future Loss Warnings</h3>

        ${
          upcomingLosses.length === 0
            ? `<p class="empty-text">No projected personnel losses within the next 120 days.</p>`
            : `
              <ul>
                ${upcomingLosses.map(item => `
                  <li>
                    ${getFullDisplayName(item.member)}
                    -
                    ${item.member.lossReason}
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

function renderMiniGroupPanel(title, members, extraClass) {
  return `
    <div class="panel ${extraClass}">
      <h3>${title}</h3>
      <ul>
        ${
          members.length === 0
            ? `<li>No personnel assigned.</li>`
            : members.map(member => `
  <li class="dashboard-member">
    ${getDashboardDisplay(member)}
  </li>
`).join("")
        }
      </ul>
    </div>
  `;
}

updateTopbarButton("crew roster");

function renderCrewRoster() {
  pageTitle.textContent = "Crew Roster";
  pageSubtitle.textContent = "Personnel grouped alphabetically by last name";

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
                            <button class="action-btn" onclick="editMember(${index})">Edit</button>
                            <button class="action-btn delete-btn" onclick="deleteMember(${index})">Delete</button>
                          </div>
                        </div>

                        <div class="qual-row">
                          ${(member.quals || []).map(qual => `<span class="badge">${qual}</span>`).join("")}
                        </div>

                        ${
                          member.collaterals && member.collaterals.length > 0
                            ? `<div class="qual-row">${member.collaterals.map(c => `<span class="badge collateral-badge">${c}</span>`).join("")}</div>`
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
            <li>Engineers: ${countDept(members, "Engineering")}</li>
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

  const portLE = countLEQualified(portCrew);
  const stbdLE = countLEQualified(stbdCrew);

  if (Math.abs(portLE - stbdLE) >= 2) {
    const weaker = portLE < stbdLE ? "PORT" : "STBD";
    notes.push(`LE qualified staffing is uneven. ${weaker} has fewer LE-qualified members.`);
  }

  return notes;
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

    if (safeTypeA !== safeTypeB) {
      return safeTypeA - safeTypeB;
    }

    return (a.name || "").localeCompare(b.name || "");
  });
}

window.showMissionPackageBuilder = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Mission Package Builder</h4>
      <p>
        Build a printable mission planning package with asset, crew, and checklist notes.
      </p>
    </div>

    <div class="mission-package-form">
      <label>Mission Type</label>
      <select id="missionPackageType">
        <option>SAR</option>
        <option>LE Boarding</option>
        <option>Pursuit</option>
        <option>Training</option>
        <option>Other</option>
      </select>

      <label>Selected Asset</label>
      <select id="missionPackageAsset">
        ${
          missionAssets.length === 0
            ? `<option>No FMC/PMC assets available</option>`
            : missionAssets.map((asset, index) => `
                <option value="${index}">
                  ${asset.name} - ${asset.type} - ${asset.status}
                </option>
              `).join("")
        }
      </select>

      <label>Mission Notes</label>
      <textarea id="missionPackageNotes" placeholder="Example: SAR case details, training objective, boarding notes, communications plan, weather, etc."></textarea>

      <label>Briefing Checklist</label>
      <div class="checks mission-checklist">
        <label><input type="checkbox" value="Weather checked"> Weather checked</label>
        <label><input type="checkbox" value="Comms checked"> Comms checked</label>
        <label><input type="checkbox" value="Asset status reviewed"> Asset status reviewed</label>
        <label><input type="checkbox" value="Crew qualifications reviewed"> Crew qualifications reviewed</label>
        <label><input type="checkbox" value="Risk assessment completed"> Risk assessment completed</label>
        <label><input type="checkbox" value="Command notified"> Command notified</label>
      </div>

      <button class="primary-btn scenario-btn" onclick="generateMissionPackage()">
        Generate Mission Package
      </button>
    </div>
  `;
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
        <ul>
          ${pkg.crew.map(item => `
            <li>
              <strong>${item.role}:</strong>
              ${getFullDisplayName(item.member)}
            </li>
          `).join("")}
        </ul>
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
  const confirmDelete = confirm("Delete this saved mission package?");

  if (!confirmDelete) return;

  missionPackages = missionPackages.filter(pkg => pkg.id !== id);
  saveMissionPackages();
  showSavedMissionPackages();
};

window.generateMissionPackage = function() {
  const missionAssets = assets.filter(asset =>
    asset.status === "FMC" || asset.status === "PMC"
  );

  if (missionAssets.length === 0) {
    alert("No FMC or PMC assets available.");
    return;
  }

  const missionType = document.getElementById("missionPackageType").value;
  const selectedAssetIndex = Number(document.getElementById("missionPackageAsset").value);
  const selectedAsset = missionAssets[selectedAssetIndex];
  const notes = document.getElementById("missionPackageNotes").value.trim();

  const checklist = [...document.querySelectorAll(".mission-checklist input:checked")]
    .map(input => input.value);

  const generatedCrew = buildMissionCrewForType(missionType);

  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

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

  const selectedRoles = [...document.querySelectorAll(".mission-role-select")].map(select => {
    const role = select.dataset.role;
    const member = crew[Number(select.value)];

    return {
      role,
      member
    };
  });

  const notes = document.getElementById("draftMissionNotes").textContent;
  const checklistHTML = document.getElementById("draftChecklist").innerHTML;

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
    </div>
  `;
};

function isDuplicateMember(rank, firstName, middleInitial, lastName, editingIndexValue = null) {
  return crew.some((member, index) => {
    if (editingIndexValue !== null && index === editingIndexValue) return false;

    return (
      (member.rank || "").trim().toLowerCase() === rank.trim().toLowerCase() &&
      (member.firstName || "").trim().toLowerCase() === firstName.trim().toLowerCase() &&
      (member.middleInitial || "").trim().toLowerCase() === middleInitial.trim().toLowerCase() &&
      (member.lastName || "").trim().toLowerCase() === lastName.trim().toLowerCase()
    );
  });
}

function buildMissionCrewForType(missionType) {
  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

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

function renderScenarioBuilder() {
  pageTitle.textContent = "Scenario Builder";
  pageSubtitle.textContent = "Run availability checks, mission crews, and training crews";

  const sortedCrew = sortMembers(crew);

  content.innerHTML = `
    <section class="scenario-layout">

      <div class="panel">
        <h3>Personnel Availability</h3>
        <p class="member-notes">
          Temporarily mark selected personnel unavailable without changing the saved roster.
        </p>

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
      </div>

      <div class="panel">
        <h3>Mission Crew Generators</h3>
        <p class="member-notes">
          Generate administrative crews from available PORT, STBD, and Day Worker personnel.
        </p>

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

        <button class="primary-btn scenario-btn" onclick="showMissionPackageBuilder()">
          Mission Package Builder
        </button>

        <button class="secondary-btn scenario-btn" onclick="showSavedMissionPackages()">
          Saved Mission Packages
        </button>
      </div>

      <div class="panel">
        <h3>Training Crew Generator</h3>
        <p class="member-notes">
          Build a training crew with mentors and break-ins when available.
        </p>

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

        <button class="primary-btn scenario-btn" onclick="showMultiAssetMission()">
          Multi-Asset Mission Planner
        </button>

        <button class="secondary-btn scenario-btn" onclick="renderScenarioBuilder()">
          Reset Scenario Builder
        </button>
      </div>

      <div class="panel scenario-results-panel">
        <h3>Scenario Results</h3>
        <div id="scenarioResult">
          Choose a scenario or crew generator to view results.
        </div>
      </div>

    </section>
  `;
}

function checkReadinessFromList(sectionName, crewList) {
  const members = sortMembers(crewList.filter(member =>
    member.section === sectionName &&
    member.status === "Available"
  ));

  const missing = [];

  readinessRequirements.forEach(req => {
    const hasRequirement = members.some(member => memberHasQual(member, req));

    if (!hasRequirement) {
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

function getDayWorkerOptionsFromList(requiredQual, crewList) {
  return sortMembers(crewList.filter(member =>
    member.section === "Day Worker" &&
    member.status === "Available" &&
    memberHasQual(member, requiredQual)
  ));
}

window.runScenario = function() {
  const selectedInputs = [...document.querySelectorAll(".scenario-person input:checked")];

  if (selectedInputs.length === 0) {
    alert("Select at least one affected member.");
    return;
  }

  const temporaryStatus = document.getElementById("scenarioStatus").value;

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
        ${affectedMembers.map(member => `
          <li>${getFullDisplayName(member)} - ${member.section}</li>
        `).join("")}
      </ul>
    </div>

    ${renderScenarioReadinessResult(portResult, simulatedCrew)}
    ${renderScenarioReadinessResult(stbdResult, simulatedCrew)}
  `;
};

window.generateSkeletonCrew = function() {
  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

  const requiredRoles = ["OOD", "PCX", "PG", "ENG", "BO", "BTM"];

  const selectedCrew = [];
  const filledRoles = {};

  function canFillRole(member, role) {
    if (role === "PCX") {
      return memberHasQual(member, "PCX") || memberHasQual(member, "CX");
    }

    return memberHasQual(member, role);
  }

  requiredRoles.forEach(role => {
    const candidate = availableCrew.find(member =>
      !selectedCrew.includes(member) &&
      canFillRole(member, role)
    );

    if (candidate) {
      selectedCrew.push(candidate);
      filledRoles[role] = candidate;
    }
  });

  const missingRoles = requiredRoles.filter(role => !filledRoles[role]);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Skeleton Crew Generator</h4>
      <p>
        Watch Keeper attempted to build a bare-minimum crew using available PORT, STBD, and Day Worker personnel.
      </p>
    </div>

    ${
      missingRoles.length === 0
        ? `<div class="scenario-readiness ready-panel">
            <h4>Skeleton Crew Found</h4>
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
            <h4>Skeleton Crew Incomplete</h4>

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
};

window.generateSarCrew = function() {
  const assetCheck = getAssetForMission("SAR");  
  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

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

  selectMember("Coxswain", member =>
    memberHasQual(member, "PCX") || memberHasQual(member, "CX")
  );

  selectMember("Engineer", member =>
    memberHasQual(member, "ENG")
  );

  selectMember("Boarding / Crew Support", member =>
    memberHasQual(member, "BO") || memberHasQual(member, "BTM")
  );

  selectMember("Additional Crew", member =>
    memberHasQual(member, "CR") ||
    memberHasQual(member, "BTM") ||
    memberHasQual(member, "BO") ||
    memberHasQual(member, "ENG") ||
    memberHasQual(member, "CX") ||
    memberHasQual(member, "PCX")
  );

  const requiredRoles = [
    "Coxswain",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const missingRoles = requiredRoles.filter(role => !filledRoles[role]);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>SAR Crew Generator</h4>
      <p>
        Watch Keeper attempted to build a SAR crew using available PORT, STBD, and Day Worker personnel.
      </p>

      <p><strong>Asset Check:</strong> %{assetCheck.message}</p>
    </div>

    ${
      missingRoles.length === 0
        ? `<div class="scenario-readiness ready-panel">
            <h4>SAR Crew Found</h4>
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
            <h4>SAR Crew Incomplete</h4>

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
};

window.generatePursuitCrew = function() {
  const assetCheck = getAssetForMission("Pursuit");
  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

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

  selectMember("Pursuit Coxswain", member =>
    memberHasQual(member, "PCX")
  );

  selectMember("Pursuit Gunner", member =>
    memberHasQual(member, "PG")
  );

  selectMember("Engineer", member =>
    memberHasQual(member, "ENG")
  );

  selectMember("Boarding / Crew Support", member =>
    memberHasQual(member, "BO") || memberHasQual(member, "BTM")
  );

  selectMember("Additional Crew", member =>
    memberHasQual(member, "CR") ||
    memberHasQual(member, "BTM") ||
    memberHasQual(member, "BO") ||
    memberHasQual(member, "ENG") ||
    memberHasQual(member, "CX") ||
    memberHasQual(member, "PCX")
  );

  const requiredRoles = [
    "Pursuit Coxswain",
    "Pursuit Gunner",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const missingRoles = requiredRoles.filter(role => !filledRoles[role]);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Pursuit Crew Generator</h4>
      <p>
        Watch Keeper attempted to build a pursuit-capable crew using available PORT, STBD, and Day Worker personnel.
      </p>
      <p><strong>Asset Check:</strong> ${assetCheck.message}</p>
    </div>

    ${
      missingRoles.length === 0
        ? `<div class="scenario-readiness ready-panel">
            <h4>Pursuit Crew Found</h4>
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
            <h4>Pursuit Crew Incomplete</h4>

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
};

window.generateRandomCrew = function() {
  const availableCrew = crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  );

  const shuffledCrew = [...availableCrew].sort(() => Math.random() - 0.5);

  const selectedCrew = [];
  const filledRoles = {};

  function selectRandomMember(role, condition) {
    const candidate = shuffledCrew.find(member =>
      !selectedCrew.includes(member) &&
      condition(member)
    );

    if (candidate) {
      selectedCrew.push(candidate);
      filledRoles[role] = candidate;
    }
  }

  selectRandomMember("Coxswain", member =>
    memberHasQual(member, "PCX") || memberHasQual(member, "CX")
  );

  selectRandomMember("Engineer", member =>
    memberHasQual(member, "ENG")
  );

  selectRandomMember("Boarding / Crew Support", member =>
    memberHasQual(member, "BO") || memberHasQual(member, "BTM")
  );

  selectRandomMember("Additional Crew", member =>
    memberHasQual(member, "CR") ||
    memberHasQual(member, "BTM") ||
    memberHasQual(member, "BO") ||
    memberHasQual(member, "ENG") ||
    memberHasQual(member, "CX") ||
    memberHasQual(member, "PCX")
  );

  const requiredRoles = [
    "Coxswain",
    "Engineer",
    "Boarding / Crew Support",
    "Additional Crew"
  ];

  const missingRoles = requiredRoles.filter(role => !filledRoles[role]);

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>Random Crew Generator</h4>
      <p>
        Watch Keeper randomly selected a crew from available PORT, STBD, and Day Worker personnel.
      </p>
    </div>

    ${
      missingRoles.length === 0
        ? `<div class="scenario-readiness ready-panel">
            <h4>Random Crew Found</h4>
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
            <h4>Random Crew Incomplete</h4>

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
};

window.generateTrainingCrew = function() {
  const trainingType = document.getElementById("trainingType").value;

  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

  const breakIns = availableCrew.filter(member =>
    memberHasQual(member, "B/I")
  );

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
    selectMember("Mentor / Coxswain", member =>
      memberHasQual(member, "PCX") || memberHasQual(member, "CX")
    );

    selectMember("Break-In / Trainee", member =>
      breakIns.includes(member)
    );

    selectMember("Engineer", member =>
      memberHasQual(member, "ENG")
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

  if (trainingType === "Engineer Training") {
    selectMember("Engineer Mentor", member =>
      memberHasQual(member, "ENG")
    );

    selectMember("Break-In / Trainee", member =>
      breakIns.includes(member)
    );

    selectMember("Coxswain", member =>
      memberHasQual(member, "PCX") || memberHasQual(member, "CX")
    );

    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

  if (trainingType === "Boarding Team Training") {
    selectMember("Boarding Mentor", member =>
      memberHasQual(member, "BO") || memberHasQual(member, "BTM")
    );

    selectMember("Break-In / Trainee", member =>
      breakIns.includes(member)
    );

    selectMember("Coxswain", member =>
      memberHasQual(member, "PCX") || memberHasQual(member, "CX")
    );

    selectMember("Engineer", member =>
      memberHasQual(member, "ENG")
    );
  }

  if (trainingType === "Pursuit Training") {
    selectMember("Pursuit Coxswain Mentor", member =>
      memberHasQual(member, "PCX")
    );

    selectMember("Pursuit Gunner Mentor", member =>
      memberHasQual(member, "PG")
    );

    selectMember("Break-In / Trainee", member =>
      breakIns.includes(member)
    );

    selectMember("Engineer", member =>
      memberHasQual(member, "ENG")
    );

    selectMember("Additional Crew", member =>
      memberHasQual(member, "CR") ||
      memberHasQual(member, "BTM") ||
      memberHasQual(member, "BO") ||
      memberHasQual(member, "CX") ||
      memberHasQual(member, "PCX")
    );
  }

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

  const availableCrew = sortMembers(crew.filter(member =>
    member.status === "Available" &&
    (
      member.section === "PORT" ||
      member.section === "STBD" ||
      member.section === "Day Worker"
    )
  ));

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
    alert("Select at least one asset.");
    return;
  }

  const selectedAssets = selectedIndexes.map(index => missionAssets[index]);

  generateMultiAssetMission(selectedAssets);
};

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

    roles.forEach(role => {
      const member = selectMember(candidate => {
        if (role === "CX") {
          return memberHasQual(candidate, "PCX") || memberHasQual(candidate, "CX");
        }

        return memberHasQual(candidate, role);
      });

      if (member) {
        filledRoles[role] = member;
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
        Watch Keeper attempted to crew all FMC/PMC assets without assigning the same member twice.
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
}

function renderTrainingScenarioResult(trainingType, filledRoles) {
  const requiredRoles = Object.keys(filledRoles);
  const missingTrainingPiece = !filledRoles["Break-In / Trainee"];

  document.getElementById("scenarioResult").innerHTML = `
    <div class="scenario-summary">
      <h4>${trainingType}</h4>
      <p>
        Watch Keeper generated a training crew using available PORT, STBD, and Day Worker personnel.
      </p>
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
}

function renderScenarioReadinessResult(result, crewList) {
  return `
    <div class="scenario-readiness ${result.ready ? "ready-panel" : "not-ready-panel"}">
      <h4>${result.section} Section</h4>

      <p>
        <strong>${result.ready ? "MISSION CAPABLE" : "NOT MISSION CAPABLE"}</strong>
      </p>

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
};

function renderSettings() {
  pageTitle.textContent = "Settings";
  pageSubtitle.textContent = "Manage Watch Keeper data";

  content.innerHTML = `
  <div class="panel">
    <h3>Personnel Data</h3>
    <p>Export a backup, import a saved roster, print reports, or wipe all personnel from this device.</p>

    <button class="primary-btn settings-btn" onclick="exportRosterBackup()">
      Export Roster Backup
    </button>

    <button class="secondary-btn settings-btn" onclick="triggerRosterImport()">
      Import Roster Backup
    </button>

    <button class="primary-btn settings-btn" onclick="window.print()">
      Print Current View
    </button>

    <button class="action-btn delete-btn settings-btn" onclick="wipeAllPersonnel()">
      Wipe All Personnel
    </button>
  </div>
`;
}

window.exportRosterBackup = function() {
  const backupData = {
    app: "Watch Keeper",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    crew
  };

  const fileData = JSON.stringify(backupData, null, 2);
  const blob = new Blob([fileData], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `watch-keeper-backup-${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

window.triggerRosterImport = function() {
  document.getElementById("importRosterInput").click();
};

document.getElementById("importRosterInput").addEventListener("change", function(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (!importedData.crew || !Array.isArray(importedData.crew)) {
        alert("Invalid Watch Keeper backup file.");
        return;
      }

      const confirmImport = confirm(
        "Importing this backup will replace your current saved roster. Continue?"
      );

      if (!confirmImport) return;

      crew = importedData.crew;
      saveCrew();
      renderSettings();

      alert("Roster backup imported successfully.");
    } catch (error) {
      alert("Could not read backup file.");
    }
  };

  reader.readAsText(file);

  event.target.value = "";
});

window.wipeAllPersonnel = function() {
  const confirmOne = confirm("This will permanently delete all saved personnel. Continue?");
  if (!confirmOne) return;

  const confirmTwo = confirm("Are you absolutely sure? This cannot be undone.");
  if (!confirmTwo) return;

  crew = [];
  saveCrew();
  renderSettings();

  alert("All personnel have been wiped.");
};

function renderPlaceholder(title, subtitle) {
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;

  content.innerHTML = `
    <div class="panel">
      <h3>${title}</h3>
      <p>This section will be built next.</p>
    </div>
  `;
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

    <div class="panel">
      <h3>Pursuit Capable Assets: ${summary.pursuit}</h3>
    </div>

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
  const name = document.getElementById("assetName").value.trim();
  const type = document.getElementById("assetType").value;
  const pursuit = document.getElementById("assetPursuit").value;
  const crewSize = document.getElementById("assetCrewSize").value;
  const missionProfile = document.getElementById("assetMissionProfile").value;
  const status = document.getElementById("assetStatus").value;
  const pmcDescription = document.getElementById("assetPmcDescription").value.trim();
  const notes = document.getElementById("assetNotes").value.trim();

  if (!name) {
    alert("Enter an asset name or hull number.");
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
  assetModal.classList.add("hidden");
  clearAssetModal();
  renderAssets();
};

function clearAssetModal() {
  editingAssetIndex = null;

  assetModalTitle.textContent = "Add Asset";

  document.getElementById("assetName").value = "";
  document.getElementById("assetType").value = "45 RB-M";
  document.getElementById("assetPursuit").value = "Yes";
  document.getElementById("assetCrewSize").value = "4";
  document.getElementById("assetMissionProfile").value = "SAR";
  document.getElementById("assetStatus").value = "FMC";
  document.getElementById("assetPmcDescription").value = "";
  document.getElementById("assetNotes").value = "";
  document.getElementById("pmcBox").classList.add("hidden");
}

function getAssetStatusBadge(status) {
  return `<span class="asset-status-badge ${status}">${status}</span>`;
}

function getAssetSummary() {
  return {
    total: assets.length,
    fmc: assets.filter(asset => asset.status === "FMC").length,
    pmc: assets.filter(asset => asset.status === "PMC").length,
    nmc: assets.filter(asset => asset.status === "NMC").length,
    pursuit: assets.filter(asset => asset.pursuit === "Yes").length
  };
}

document.getElementById("assetStatus").addEventListener("change", () => {
  const status = document.getElementById("assetStatus").value;
  document.getElementById("pmcBox").classList.toggle("hidden", status !== "PMC");
});

document.getElementById("closeAssetModal").addEventListener("click", () => {
  assetModal.classList.add("hidden");
});

document.getElementById("saveAsset").addEventListener("click", addAsset);

window.deleteAsset = function(index) {
  const confirmDelete = confirm(`Delete asset ${assets[index].name}?`);

  if (!confirmDelete) return;

  assets.splice(index, 1);
  saveAssets();
  renderAssets();
};

window.editAsset = function(index) {
  editingAssetIndex = index;

  const asset = assets[index];

  assetModalTitle.textContent = "Edit Asset";

  document.getElementById("assetName").value = asset.name || "";
  document.getElementById("assetType").value = asset.type || "45 RB-M";
  document.getElementById("assetPursuit").value = asset.pursuit || "Yes";
  document.getElementById("assetCrewSize").value = asset.crewSize || "4";
  document.getElementById("assetMissionProfile").value = asset.missionProfile || "SAR";
  document.getElementById("assetStatus").value = asset.status || "FMC";
  document.getElementById("assetPmcDescription").value = asset.pmcDescription || "";
  document.getElementById("assetNotes").value = asset.notes || "";

  document.getElementById("pmcBox").classList.toggle("hidden", asset.status !== "PMC");

  assetModal.classList.remove("hidden");

  const modalCard = assetModal.querySelector(".modal-card");
  modalCard.scrollTop = 0;
};

function clearModal() {
  editingIndex = null;

  modalTitle.textContent = "Add Crew Member";

  document.getElementById("memberRank").value = "";
  document.getElementById("memberFirstName").value = "";
  document.getElementById("memberMiddleInitial").value = "";
  document.getElementById("memberLastName").value = "";

  document.getElementById("memberTitle").value = "None";
  document.getElementById("customTitle").value = "";
  document.getElementById("memberDept").value = "Deck";
  document.getElementById("memberSection").value = "PORT";
  document.getElementById("memberStatus").value = "Available";
  document.getElementById("memberNotes").value = "";
  document.getElementById("customCollateral").value = "";
  document.getElementById("lossDate").value = "";
  document.getElementById("lossReason").value = "None";

  modalSmartResult.classList.add("hidden");
  modalSmartResult.innerHTML = "";

  document.querySelectorAll(".checks input").forEach(input => {
    input.checked = false;
  });
}

function closeMemberModal() {
  modal.classList.add("hidden");
  clearModal();

  const modalCard = document.querySelector(".modal-card");
  modalCard.scrollTop = 0;
}

setTimeout(() => {
    document.getElementById("memberRank").focus();
}, 50);

window.editMember = function(index) {
  editingIndex = index;

  const member = crew[index];

  modalTitle.textContent = "Edit Crew Member";

  document.getElementById("memberRank").value = member.rank || "";
  document.getElementById("memberFirstName").value = member.firstName || "";
  document.getElementById("memberMiddleInitial").value = member.middleInitial || "";
  document.getElementById("memberLastName").value = member.lastName || "";

  document.getElementById("memberDept").value = member.dept || "Deck";
  document.getElementById("memberSection").value = member.section || "PORT";
  document.getElementById("memberStatus").value = member.status || "Available";
  document.getElementById("memberNotes").value = member.notes || "";
  document.getElementById("lossDate").value = member.lossDate || "";
  document.getElementById("lossReason").value = member.lossReason || "None";

  const standardTitles = ["CO", "XPO", "EPO", "AEPO", "1LT", "OPS", "TPO", "MAA", "HAZMAT"];

  if (member.title && standardTitles.includes(member.title)) {
    document.getElementById("memberTitle").value = member.title;
    document.getElementById("customTitle").value = "";
  } else if (member.title) {
    document.getElementById("memberTitle").value = "Custom";
    document.getElementById("customTitle").value = member.title;
  } else {
    document.getElementById("memberTitle").value = "None";
    document.getElementById("customTitle").value = "";
  }

  document.querySelectorAll(".checks input").forEach(input => {
    const quals = member.quals || [];
    const collaterals = member.collaterals || [];

    input.checked = quals.includes(input.value) || collaterals.includes(input.value);
  });

  document.getElementById("customCollateral").value = "";

  modalSmartResult.classList.add("hidden");
  modalSmartResult.innerHTML = "";

  modal.classList.remove("hidden");
};

window.deleteMember = function(index) {
  const confirmDelete = confirm(`Delete ${getFullDisplayName(crew[index])}?`);

  if (!confirmDelete) return;

  crew.splice(index, 1);
  saveCrew();
  renderCrewRoster();
};

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    const page = button.dataset.page;

    updateTopbarButton(page);

    if (page === "dashboard") renderDashboard();
    if (page === "crew") renderCrewRoster();
    if (page === "assets") renderAssets();
    if (page === "sections") renderDutySections();
    if (page === "readiness") renderReadinessCheck();
    if (page === "scenarios") renderScenarioBuilder();
    if (page === "smart-settings") renderSmartAssignmentSettings();
    if (page === "settings") renderSettings();
  });
});

document.getElementById("openAddMember").addEventListener("click", () => {
  clearModal();
  modal.classList.remove("hidden");

  const modalCard = document.querySelector(".modal-card");
  modalCard.scrollTop = 0;
});

document.getElementById("closeModal").addEventListener("click", closeMemberModal);

document.getElementById("smartAssignBtn").addEventListener("click", runModalSmartAssignment);

document.getElementById("saveMember").addEventListener("click", () => {
  const rank = document.getElementById("memberRank").value.trim();
  const firstName = document.getElementById("memberFirstName").value.trim();
  const middleInitial = document.getElementById("memberMiddleInitial").value.trim().replace(".", "");
  const lastName = document.getElementById("memberLastName").value.trim();

  const title = getMemberTitle();
  const dept = document.getElementById("memberDept").value;
  const section = document.getElementById("memberSection").value;
  const status = document.getElementById("memberStatus").value;
  const notes = document.getElementById("memberNotes").value.trim();
  const quals = getSelectedModalQuals();
  const collaterals = getSelectedModalCollaterals();
  const lossDate = document.getElementById("lossDate").value;
  const lossReason = document.getElementById("lossReason").value;

  if (!rank || !firstName || !lastName) {
    alert("Enter rank, first name, and last name.");
    return;
  }

  if (isDuplicateMember(rank, firstName, middleInitial, lastName, editingIndex)) {
    alert("This person already appears to be in the roster.");
    setTimeout(() => {
      document.getElementById("memberRank").focus();
   }, 50);
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
    notes
  };

  if (editingIndex === null) {
    crew.push(memberData);
  } else {
    crew[editingIndex] = memberData;
  }

  saveCrew();
  closeMemberModal();
  renderCrewRoster();
});

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

renderDashboard();
