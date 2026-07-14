export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'PiersightMaharshi'; // 🔴 Change this
    const REPO_NAME = 'RF_Cable'; // 🔴 Change this
    const LOG_FILE_PATH = 'data/usage_log.json';
    const STATS_FILE_PATH = 'data/dashboard_stats.json';
    
    const { psSr, userName, testName, action } = req.body;
    
    if (!psSr || !userName || !testName || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 1. Get current usage log file
    const logFileResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const logFileData = await logFileResponse.json();
    const currentLog = JSON.parse(
      Buffer.from(logFileData.content, 'base64').toString()
    );
    
    // 2. Add new entry
    const newEntry = {
      timestamp: new Date().toISOString(),
      psSr: psSr,
      userName: userName,
      testName: testName,
      action: action, // 'mated' or 'demated'
    };
    
    currentLog.push(newEntry);
    
    // 3. Calculate mate count for this cable
    const cableLogs = currentLog.filter(log => log.psSr === psSr);
    const mateCount = cableLogs.filter(log => log.action === 'mated').length;
    const demateCount = cableLogs.filter(log => log.action === 'demated').length;
    newEntry.mateCountAfter = mateCount - demateCount;
    
    // 4. Update usage log on GitHub
    const updatedContent = Buffer.from(JSON.stringify(currentLog, null, 2)).toString('base64');
    
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Log: ${action} ${psSr} by ${userName}`,
          content: updatedContent,
          sha: logFileData.sha
        })
      }
    );
    
    // 5. Update dashboard stats
    // Get cable inventory to count total
    const inventoryResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/cables.csv`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );
    
    let totalInventory = 0;
    if (inventoryResponse.ok) {
      const csvText = await inventoryResponse.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      totalInventory = lines.length - 1; // Minus header
    }
    
    // Count unique cables that have been mated (in use)
    const matedCables = [...new Set(
      currentLog
        .filter(log => log.action === 'mated')
        .map(log => log.psSr)
    )];
    const inUse = matedCables.length;
    const available = totalInventory - inUse;
    
    // Update stats file
    const statsResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${STATS_FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const statsFileData = await statsResponse.json();
    
    const newStats = {
      totalInventory: totalInventory,
      inUse: inUse,
      available: available,
      damaged: 0,
      lastUpdated: new Date().toISOString()
    };
    
    const updatedStatsContent = Buffer.from(JSON.stringify(newStats, null, 2)).toString('base64');
    
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${STATS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update stats: ${inUse} in use, ${totalInventory} total`,
          content: updatedStatsContent,
          sha: statsFileData.sha
        })
      }
    );
    
    res.status(200).json({
      success: true,
      entry: newEntry,
      stats: newStats
    });
    
  } catch (error) {
    console.error('Write error:', error);
    res.status(500).json({ error: error.message });
  }
}