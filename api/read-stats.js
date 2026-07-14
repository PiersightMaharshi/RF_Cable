export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'PiersightMaharshi'; // 🔴 Change this
    const REPO_NAME = 'RF_Cable'; // 🔴 Change this
    // Read stats
    const statsResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/dashboard_stats.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );
    
    if (!statsResponse.ok) {
      return res.status(200).json({ totalInventory: 0, inUse: 0, available: 0, damaged: 0 });
    }
    
    const stats = await statsResponse.json();
    
    // Read usage log
    const logResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/usage_log.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );
    
    let usageLog = [];
    if (logResponse.ok) {
      usageLog = await logResponse.json();
    }
    
    res.status(200).json({
      stats: stats,
      recentLogs: usageLog.slice(-20).reverse() // Last 20 entries
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
}