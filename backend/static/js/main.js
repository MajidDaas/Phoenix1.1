// main.js - Main application logic for Phoenix Council Elections

// --- Candidate Data (Assuming this is fetched or defined elsewhere, or re-imported) ---
// For this fix, we assume `candidates` array is available globally or imported.
// If it's not, you'll need to ensure it's accessible here.
// For now, we'll assume it exists as in previous examples.
// const candidates = [ ... ];

// --- State Management ---
let selectedCandidates = [];
let executiveCandidates = [];
const maxSelections = 15;
const maxExecutives = 7;
let activeDetails = null;
let electionOpen = true; // This should ideally be synced with the backend
let currentChart = null;
const totalVoters = 20; // Example value, should come from backend
let voterId = null; // To store the verified voter ID

// --- DOM Elements ---
const candidateList = document.getElementById('candidateList');
const selectedCount = document.getElementById('selectedCount');
const executiveCount = document.getElementById('executiveCount');
const submitVoteBtn = document.getElementById('submitVoteBtn');
const electionStatus = document.getElementById('electionStatus');
const resultsContent = document.getElementById('resultsContent');
const winnerInfoPopup = document.getElementById('winnerInfoPopup');

// --- Candidate UI Functions ---

function initCandidates() {
    // Check if candidates data is available
    if (typeof candidates === 'undefined' || !Array.isArray(candidates)) {
        console.error("Candidates data is not available or not an array.");
        // Handle error or display message
        candidateList.innerHTML = "<p>Error loading candidates. Please try again later.</p>";
        return;
    }

    candidateList.innerHTML = '';
    candidates.forEach(candidate => {
        // Safely determine activity class
        let activityClass = 'activity-low'; // Default
        let activityText = 'Low Activity';
        if (candidate.activity !== undefined) {
            if (candidate.activity >= 14) {
                activityClass = 'activity-high';
                activityText = 'High Activity';
            } else if (candidate.activity >= 7) {
                activityClass = 'activity-medium';
                activityText = 'Medium Activity';
            }
        }

        const card = document.createElement('div');
        card.className = 'candidate-item';
        card.dataset.id = candidate.id;
        card.innerHTML = `
            <div class="candidate-info" data-id="${candidate.id}">
                <i class="fas fa-info"></i>
            </div>
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                 onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${encodeURIComponent(candidate.name.charAt(0) || 'N')}'; this.onerror=null;">
            <div class="candidate-name">${candidate.name || 'Unknown Candidate'}</div>
            <div class="candidate-position">${candidate.position || 'Position Not Listed'}</div>
            <div class="activity-indicator ${activityClass}">${activityText}</div>
            <div class="candidate-details" id="details-${candidate.id}">
                <div class="close-details" data-id="${candidate.id}">×</div>
                <h4>${candidate.name || 'Unknown Candidate'}</h4>
                <p>${candidate.bio || 'No biography available.'}</p>
                <p><strong>Weekly Activity:</strong> ${candidate.activity !== undefined ? candidate.activity : 'N/A'} hours</p>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.candidate-info') || e.target.closest('.close-details')) {
                return;
            }
            const id = parseInt(card.dataset.id, 10);
            if (!isNaN(id)) {
                selectCandidate(id);
            }
        });
        candidateList.appendChild(card);
    });

    document.querySelectorAll('.candidate-info').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(icon.dataset.id, 10);
            if (!isNaN(id)) {
                showCandidateDetails(id);
            }
        });
    });

    document.querySelectorAll('.close-details').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(button.dataset.id, 10);
            if (!isNaN(id)) {
                hideCandidateDetails(id);
            }
        });
    });
}

function showCandidateDetails(id) {
    if (activeDetails) {
        hideCandidateDetails(activeDetails);
    }
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.add('show');
        activeDetails = id;
    }
}

function hideCandidateDetails(id) {
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.remove('show');
        activeDetails = null;
    }
}

// --- FIXED VOTING LOGIC ---
function selectCandidate(id) {
    if (!electionOpen) {
        showMessage('Voting is currently closed', 'error');
        return;
    }

    // Ensure candidates data is available
    if (typeof candidates === 'undefined' || !Array.isArray(candidates)) {
        showMessage('Candidate data is not loaded correctly.', 'error');
        return;
    }

    const candidate = candidates.find(c => c.id === id);
    if (!candidate) {
        console.warn(`Candidate with ID ${id} not found.`);
        return;
    }

    const isSelected = selectedCandidates.includes(id);
    const isExecutive = executiveCandidates.includes(id);

    // --- CORRECTED LOGIC ---
    if (isSelected) {
        // Clicked on a candidate that is already selected
        if (isExecutive) {
            // If it's an Executive Officer, remove it from the EO list (FIX #1)
            executiveCandidates = executiveCandidates.filter(cId => cId !== id);
            console.log(`Removed candidate ID ${id} from Executive Officers.`);
        } else {
            // It's selected but NOT an EO.
            // Check if we can promote it to EO
            if (executiveCandidates.length < maxExecutives) {
                executiveCandidates.push(id);
                console.log(`Promoted candidate ID ${id} to Executive Officer.`);
            } else {
                // EO list is full. Interpret click as deselection (3rd click in cycle).
                selectedCandidates = selectedCandidates.filter(cId => cId !== id);
                console.log(`Deselected candidate ID ${id} (EO list full).`);
            }
        }
    } else {
        // Clicked on a candidate that is NOT selected
        if (selectedCandidates.length < maxSelections) {
            selectedCandidates.push(id);
            console.log(`Selected candidate ID ${id}.`);
        } else {
            showMessage(`You can only select ${maxSelections} council members`, 'error');
            return;
        }
    }
    // --- END CORRECTED LOGIC ---

    updateUI();
}
// --- END FIXED VOTING LOGIC ---


function updateUI() {
    // Update counters
    if (selectedCount) selectedCount.textContent = selectedCandidates.length;
    if (executiveCount) executiveCount.textContent = executiveCandidates.length;

    // Update candidate card states
    if (candidateList) {
        document.querySelectorAll('.candidate-item').forEach(card => {
            const id = parseInt(card.dataset.id, 10);
            if (isNaN(id)) return; // Skip if ID is invalid

            const isSelected = selectedCandidates.includes(id);
            const isExecutive = executiveCandidates.includes(id);

            card.classList.toggle('selected', isSelected);
            card.classList.toggle('executive-selected', isExecutive);

            // Remove existing badges
            const existingBadge = card.querySelector('.priority-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // Add new badge if selected
            if (isSelected) {
                const badge = document.createElement('div');
                badge.className = 'priority-badge';
                // Badge number reflects selection order
                badge.textContent = selectedCandidates.indexOf(id) + 1;
                if (isExecutive) {
                    badge.classList.add('executive-badge');
                    // Badge number for EO reflects EO order
                    badge.textContent = executiveCandidates.indexOf(id) + 1;
                }
                card.appendChild(badge);
            }
        });
    }

    // Enable/disable submit button
    if (submitVoteBtn) {
        submitVoteBtn.disabled = selectedCandidates.length !== maxSelections;
    }
}


// --- Voting Process Functions ---

async function submitVote() {
    if (!voterId) {
        showMessage('You must verify your voter ID before submitting.', 'error');
        return;
    }
    if (selectedCandidates.length !== maxSelections) {
        showMessage(`Please select exactly ${maxSelections} candidates`, 'error');
        return;
    }
    if (executiveCandidates.length !== maxExecutives) {
        showMessage(`Please designate exactly ${maxExecutives} executive officers`, 'error');
        return;
    }

    if (submitVoteBtn) submitVoteBtn.disabled = true;
    const loadingElement = document.getElementById('submitLoading');
    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        // Use the API module to submit the vote
        const response = await ElectionAPI.submitVote(voterId, selectedCandidates, executiveCandidates);
        if (response.message && response.message.includes('successfully')) {
            showMessage(`Vote submitted successfully!
Selected Candidates: ${selectedCandidates.length}
Executive Officers: ${executiveCandidates.length}`, 'success');

            // Reset selections and UI
            selectedCandidates = [];
            executiveCandidates = [];
            updateUI();

            // Reset to step 1
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');
            const step3 = document.getElementById('step3');
            if (step1) step1.classList.remove('hidden');
            if (step2) step2.classList.add('hidden');
            if (step3) step3.classList.add('hidden');
            voterId = null; // Clear voter ID after submission

        } else {
            showMessage(response.message || 'Failed to submit vote. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Error submitting vote:', err);
        showMessage('An error occurred while submitting your vote. Please try again.', 'error');
    } finally {
        if (submitVoteBtn) submitVoteBtn.disabled = false;
        if (loadingElement) loadingElement.classList.add('hidden');
    }
}


async function requestVoterID() {
    const emailInput = document.getElementById('voterEmail');
    const phoneInput = document.getElementById('voterPhone');
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!email || !phone) {
        showMessage('Please enter both email and phone number', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    if (phone.length !== 4 || !/^\d+$/.test(phone)) {
        showMessage('Please enter exactly 4 digits for your phone number', 'error');
        return;
    }

    const requestBtn = document.getElementById('requestVoterBtn');
    const loadingElement = document.getElementById('requestLoading');
    if (requestBtn) requestBtn.disabled = true;
    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        const response = await ElectionAPI.requestVoterID(email, phone);
        if (response.message && response.message.includes('successfully')) {
            // For demo, the API might return the ID directly
            // const voterId = response.voterId;
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');
            if (step1) step1.classList.add('hidden');
            if (step2) step2.classList.remove('hidden');
            // Show message with ID if returned by API
            showMessage(`Demo: ${response.message}`, 'info');
        } else {
            showMessage(response.message || 'Failed to request voter ID', 'error');
        }
    } catch (err) {
        console.error('Error requesting voter ID:', err);
        showMessage('An error occurred. Please try again.', 'error');
    } finally {
        if (requestBtn) requestBtn.disabled = false;
        if (loadingElement) loadingElement.classList.add('hidden');
    }
}

function skipIDRequest() {
    // Check if election is open
    if (!electionOpen) {
        showMessage('Voting is currently closed', 'error');
        return;
    }
    voterId = "DEMO_VID_" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const confirmedIdElement = document.getElementById('confirmedVoterId');
    if (confirmedIdElement) confirmedIdElement.textContent = voterId;

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) step3.classList.remove('hidden');

    initCandidates();
    updateUI();
    showMessage('Demo mode: Voter ID skipped. You may now vote.', 'success');
}

async function verifyEmailVoterId() {
    const voterIdInput = document.getElementById('emailVoterId');
    const enteredVoterId = voterIdInput ? voterIdInput.value.trim() : '';

    if (!enteredVoterId) {
        showMessage('Please enter the voter ID you received via email', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyVoterBtn');
    const loadingElement = document.getElementById('verifyLoading');
    if (verifyBtn) verifyBtn.disabled = true;
    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        const response = await ElectionAPI.verifyVoterID(enteredVoterId);
        if (response.message && response.message.includes('successfully')) {
            voterId = enteredVoterId; // Store the verified voter ID
            const confirmedIdElement = document.getElementById('confirmedVoterId');
            if (confirmedIdElement) confirmedIdElement.textContent = enteredVoterId;

            const step2 = document.getElementById('step2');
            const step3 = document.getElementById('step3');
            if (step2) step2.classList.add('hidden');
            if (step3) step3.classList.remove('hidden');

            initCandidates();
            updateUI();
            showMessage('Email verified successfully! You may now vote.', 'success');
        } else {
            showMessage(response.message || 'Invalid voter ID', 'error');
        }
    } catch (err) {
        console.error('Error verifying voter ID:', err);
        showMessage('An error occurred while verifying your ID. Please try again.', 'error');
    } finally {
        if (verifyBtn) verifyBtn.disabled = false;
        if (loadingElement) loadingElement.classList.add('hidden');
    }
}

// --- Results Functions ---

async function renderResults() {
    // Update stats elements
    const totalCandidatesElement = document.getElementById('totalCandidates');
    const voterTurnoutElement = document.getElementById('voterTurnout');
    if (totalCandidatesElement) totalCandidatesElement.textContent = candidates ? candidates.length : 0;

    // Use the API to get election status and results
    try {
        const statusResponse = await ElectionAPI.getElectionStatus();
        const resultsResponse = await ElectionAPI.getResults();

        if (statusResponse.isOpen !== undefined) {
            electionOpen = statusResponse.isOpen;
        }

        if (voterTurnoutElement) {
            voterTurnoutElement.textContent = electionOpen ?
                'Elections in Progress' :
                `${Math.round((resultsResponse.stats?.totalVotes / totalVoters || 0) * 100)}%`;
        }

        if (electionStatus) {
            if (electionOpen) {
                electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is currently open';
                electionStatus.classList.remove('closed');
            } else {
                electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
                electionStatus.classList.add('closed');
            }
        }

        if (resultsContent) {
            if (electionOpen) {
                resultsContent.innerHTML = `
                    <div class="status-info">
                        <p><i class="fas fa-info-circle"></i> Results will be available after the election is closed.</p>
                    </div>
                `;
                return;
            }

            // Use results from backend
            const resultsArray = resultsResponse.results || [];
            if (!Array.isArray(resultsArray)) {
                 throw new Error("Invalid results data received from API");
            }
            // Sort to identify executive officers (top 7 by executive votes)
            const sortedByExecutiveVotes = [...resultsArray].sort((a, b) => (b.executiveVotes || 0) - (a.executiveVotes || 0));
            const executiveOfficers = sortedByExecutiveVotes.slice(0, 7).map(c => c.name);

            let resultsHTML = `<div class="results-container">`;
            resultsArray.forEach(candidate => {
                // Find the full candidate object to get winner status and other details
                // Note: The backend now provides all necessary data in resultsArray
                const isExecutive = executiveOfficers.includes(candidate.name);
                const winnerClass = (candidate.isWinner) ? 'winner-name' : '';
                const winnerDataAttr = (candidate.isWinner) ? `data-is-winner="true"` : `data-is-winner="false"`;
                resultsHTML += `
                    <div class="result-card ${isExecutive ? 'executive' : ''}">
                        <h4>
                            <span class="${winnerClass}" ${winnerDataAttr}
                                  data-name="${candidate.name}"
                                  data-position="${candidate.position || ''}"
                                  data-bio="${candidate.bio || ''}"
                                  data-activity="${candidate.activity !== undefined ? candidate.activity : ''}"
                                  onclick="showWinnerPopup(event)">
                                ${candidate.name}
                            </span>
                        </h4>
                        <div class="progress-container">
                            <div class="progress-label">Council Votes:</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(100, (candidate.councilVotes / (resultsArray[0]?.councilVotes || 1)) * 100)}%"></div>
                            </div>
                            <div class="progress-value">${(candidate.councilVotes || 0).toLocaleString()}</div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-label">Executive Votes:</div>
                            <div class="progress-bar">
                                <div class="progress-fill executive" style="width: ${Math.min(100, (candidate.executiveVotes / (sortedByExecutiveVotes[0]?.executiveVotes || 1)) * 100)}%"></div>
                            </div>
                            <div class="progress-value">${(candidate.executiveVotes || 0).toLocaleString()}</div>
                        </div>
                    </div>
                `;
            });
            resultsHTML += `</div>`;

            resultsHTML += `
                <div class="chart-container">
                    <h3><i class="fas fa-chart-bar"></i> Vote Distribution</h3>
                    <canvas id="resultsChart" width="400" height="200"></canvas>
                </div>
            `;
            resultsContent.innerHTML = resultsHTML;

            // Create chart
            setTimeout(() => {
                const ctx = document.getElementById('resultsChart')?.getContext('2d');
                if (ctx) {
                    if (currentChart) {
                        currentChart.destroy();
                    }
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: resultsArray.map(c => c.name),
                            datasets: [
                                {
                                    label: 'Council Votes',
                                    data: resultsArray.map(c => c.councilVotes || 0),
                                    backgroundColor: 'rgba(0, 150, 87, 0.7)',
                                    borderColor: 'rgba(0, 150, 87, 1)',
                                    borderWidth: 1
                                },
                                {
                                    label: 'Executive Votes',
                                    data: resultsArray.map(c => c.executiveVotes || 0),
                                    backgroundColor: 'rgba(243, 156, 18, 0.7)',
                                    borderColor: 'rgba(243, 156, 18, 1)',
                                    borderWidth: 1
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return `${context.dataset.label}: ${context.parsed.y} votes`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Number of Votes'
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Candidates'
                                    }
                                }
                            }
                        }
                    });
                }
            }, 100);

        }
    } catch (err) {
        console.error('Error fetching results or status:', err);
        if (resultsContent) {
            resultsContent.innerHTML = `<div class="status-error"><p>Error loading results. Please try again later.</p></div>`;
        }
    }
}


// --- Winner Popup ---
function showWinnerPopup(event) {
    const target = event.currentTarget;
    const isWinner = target.getAttribute('data-is-winner') === 'true';
    if (!isWinner) {
        return;
    }
    const name = target.getAttribute('data-name');
    const position = target.getAttribute('data-position');
    const bio = target.getAttribute('data-bio');
    const activity = target.getAttribute('data-activity');

    const popupName = document.getElementById('popupName');
    const popupPosition = document.getElementById('popupPosition');
    const popupBio = document.getElementById('popupBio');
    const popupActivity = document.getElementById('popupActivity');

    if (popupName) popupName.textContent = name || '';
    if (popupPosition) popupPosition.textContent = position || '';
    if (popupBio) popupBio.textContent = bio || '';
    if (popupActivity) popupActivity.textContent = activity || '';

    if (winnerInfoPopup) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        winnerInfoPopup.style.left = `${rect.left + scrollLeft + rect.width / 2 - winnerInfoPopup.offsetWidth / 2}px`;
        winnerInfoPopup.style.top = `${rect.top + scrollTop - winnerInfoPopup.offsetHeight - 10}px`;
        winnerInfoPopup.style.display = 'block';
    }
}

function hideWinnerPopup() {
    if (winnerInfoPopup) {
        winnerInfoPopup.style.display = 'none';
    }
}

// --- Admin Functions ---

// --- FIXED ADMIN AUTHENTICATION LOGIC ---
async function authenticateAdmin() {
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput ? passwordInput.value : '';

    if (!password) {
        showMessage('Please enter admin password', 'error');
        return;
    }

    const authBtn = document.getElementById('authAdminBtn');
    const loadingElement = document.getElementById('adminAuthLoading');
    if (authBtn) authBtn.disabled = true;
    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        // Use the API module to authenticate
        const response = await ElectionAPI.authenticateAdmin(password);
        if (response.message && response.message.includes('authenticated')) {
            // FIX #2: Correctly show admin controls after successful auth
            const adminControls = document.getElementById('adminControls');
            if (adminControls) {
                 // Use classList for hiding/showing if 'hidden' class is used
                 // Otherwise, use style.display. Check your CSS.
                 // Assuming 'hidden' class is used based on index.html
                 adminControls.classList.remove('hidden');
                 // OR adminControls.style.display = 'block';
            }
            showMessage('Admin access granted', 'success');
        } else {
            showMessage(response.message || 'Authentication failed', 'error');
        }
    } catch (err) {
        console.error('Error authenticating admin:', err);
        showMessage('An error occurred during authentication. Please try again.', 'error');
    } finally {
        if (authBtn) authBtn.disabled = false;
        if (loadingElement) loadingElement.classList.add('hidden');
    }
}
// --- END FIXED ADMIN AUTHENTICATION LOGIC ---


async function toggleElection() {
    try {
        const response = await ElectionAPI.toggleElectionStatus();
        if (response.message) {
            // Update local state
            if (response.isOpen !== undefined) {
                electionOpen = response.isOpen;
            }

            // Update UI elements
            const btn = document.getElementById('electionToggle');
            if (btn) {
                if (electionOpen) {
                    btn.innerHTML = '<i class="fas fa-toggle-on"></i> Close Election';
                    btn.classList.remove('btn-danger');
                    btn.classList.add('btn-success');
                    if (electionStatus) {
                        electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is currently open';
                        electionStatus.classList.remove('closed');
                    }
                    const electionClosedMessage = document.getElementById('electionClosedMessage');
                    if (electionClosedMessage) electionClosedMessage.classList.add('hidden');
                    const step1 = document.getElementById('step1');
                    if (step1) step1.classList.remove('disabled');
                    // step2 and step3 disabled states are handled by their visibility
                } else {
                    btn.innerHTML = '<i class="fas fa-toggle-off"></i> Open Election';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-danger');
                    if (electionStatus) {
                        electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
                        electionStatus.classList.add('closed');
                    }
                    const electionClosedMessage = document.getElementById('electionClosedMessage');
                    if (electionClosedMessage) electionClosedMessage.classList.remove('hidden');
                    const step1 = document.getElementById('step1');
                    if (step1) step1.classList.add('disabled');
                    const step2 = document.getElementById('step2');
                    const step3 = document.getElementById('step3');
                    if (step2) step2.classList.add('disabled');
                    if (step3) step3.classList.add('disabled');
                }
            }
            showMessage(response.message, 'success');

            // Update results display if on results tab
            const resultsTab = document.getElementById('results');
            if (resultsTab && resultsTab.classList.contains('active')) {
                renderResults(); // Re-fetch status and results
            }
        } else {
            showMessage(response.message || 'Failed to toggle election status', 'error');
        }
    } catch (err) {
        console.error('Error toggling election:', err);
        showMessage('An error occurred while toggling the election. Please try again.', 'error');
    }
}

async function refreshData() {
    showMessage('Data refresh simulated. In a full app, this would fetch new data.', 'success');
    // In a real app, this might re-fetch candidate or vote data
    // await fetchDataFromBackend();
    // updateUI();
}

async function exportVotes() {
    try {
        await ElectionAPI.exportVotes();
        showMessage('Votes export initiated. Check browser console or downloads.', 'success');
        // In a real app, the API call might trigger a file download directly
    } catch (err) {
        console.error('Error exporting votes:', err);
        showMessage('An error occurred while exporting votes. Please try again.', 'error');
    }
}

async function backupToCloud() {
    showMessage('Cloud backup simulated successfully.', 'success');
    // In a real app, this would make an API call to a backup service
    // await callBackupAPI();
}


// --- Utility Functions ---

function showMessage(message, type) {
    if (!message || !type) return; // Basic validation

    const div = document.createElement('div');
    div.className = `status-message status-${type}`;
    div.innerHTML = `<p>${message}</p>`;
    // Insert into the currently active tab content
    const activeTabContent = document.querySelector('.tab-content.active');
    if (activeTabContent) {
        activeTabContent.insertBefore(div, activeTabContent.firstChild);
    } else {
        // Fallback, insert into main card if no active tab found
        const mainCard = document.querySelector('.card');
        if (mainCard) {
             mainCard.insertBefore(div, mainCard.firstChild);
        } else {
            // Last resort, append to body (though styling might be off)
            document.body.appendChild(div);
        }
    }
    setTimeout(() => {
        if (div.parentNode) { // Check if element is still in DOM
            div.remove();
        }
    }, 5000);
}


// --- UI Controller for Tab Switching (if needed locally) ---
const UIController = {
    switchTab: (tabName) => {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Use data-tab attribute for tabs and ID for content (as per index.html)
        const tabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(tabName);

        if (tabButton) tabButton.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        // Specific actions for certain tabs
        if (tabName === 'results') {
            renderResults();
        }
        // Hide any active details when switching tabs
        if (activeDetails) {
            hideCandidateDetails(activeDetails);
        }
        // Hide winner popup when switching tabs
        hideWinnerPopup();
    }
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Phoenix Council Elections frontend (main.js) initialized');

    // Initial UI setup
    // Fetch initial election status if needed before first render
    // For now, assuming initial state is handled or will be updated by renderResults

    // Tab switching - use event listeners instead of inline onclick
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) {
                UIController.switchTab(tabName);
            }
        });
    });

    // Admin button - use event listener
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            UIController.switchTab('admin');
        });
    }

    // Voting buttons - use event listeners
    const requestVoterBtn = document.getElementById('requestVoterBtn');
    if (requestVoterBtn) requestVoterBtn.addEventListener('click', requestVoterID);

    const skipIdRequestBtn = document.getElementById('skipIdRequestBtn');
    if (skipIdRequestBtn) skipIdRequestBtn.addEventListener('click', skipIDRequest);

    const verifyVoterBtn = document.getElementById('verifyVoterBtn');
    if (verifyVoterBtn) verifyVoterBtn.addEventListener('click', verifyEmailVoterId);

    const submitVoteBtn = document.getElementById('submitVoteBtn');
    if (submitVoteBtn) submitVoteBtn.addEventListener('click', submitVote);

    // Admin buttons - use event listeners
    const authAdminBtn = document.getElementById('authAdminBtn');
    if (authAdminBtn) authAdminBtn.addEventListener('click', authenticateAdmin);

    const electionToggleBtn = document.getElementById('electionToggle');
    if (electionToggleBtn) electionToggleBtn.addEventListener('click', toggleElection);

    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', refreshData);

    const exportVotesBtn = document.getElementById('exportVotesBtn');
    if (exportVotesBtn) exportVotesBtn.addEventListener('click', exportVotes);

    const backupToCloudBtn = document.getElementById('backupToCloudBtn');
    if (backupToCloudBtn) backupToCloudBtn.addEventListener('click', backupToCloud);

    // Initialize the application for the vote tab
    // initCandidates(); // Don't init candidates here, wait for step 3
    updateUI();
    // renderResults(); // Don't render results here, wait for results tab

    // Add click outside listener for candidate details
    document.addEventListener('click', (e) => {
        if (activeDetails && !e.target.closest('.candidate-item')) {
            hideCandidateDetails(activeDetails);
        }
    });

    // Add click outside listener for winner popup (optional, as it already has mouseover/mouseout)
    // This handles clicks *outside* the popup to close it.
    document.addEventListener('click', (e) => {
        if (winnerInfoPopup && winnerInfoPopup.style.display === 'block' &&
            !winnerInfoPopup.contains(e.target) &&
            !e.target.closest('.winner-name')) {
            hideWinnerPopup();
        }
    });

    // Initial render of results to get status
    renderResults();
});
