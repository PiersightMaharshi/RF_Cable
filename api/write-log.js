export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'PiersightMaharshi';
  const REPO_NAME = 'RF_Cable';
  const LOG_FILE_PATH = 'data/usage_log.json';

  try {
    // ============================================
    // GET - Read all logs
    // ============================================
    if (req.method === 'GET') {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE_PATH}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.raw'
          }
        }
      );
      
      if (response.ok) {
        const logs = await response.json();
        return res.status(200).json(logs);
      } else {
        // File doesn't exist yet, return empty
        return res.status(200).json([]);
      }
    }

    // ============================================
    // POST - Add new log entry
    // ============================================
    if (req.method === 'POST') {
      const newLog = req.body;
      
      if (!newLog || !newLog.psSr) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // 1. Get current file from GitHub
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE_PATH}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      let logs = [];
      let sha = null;
      
      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        logs = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
        sha = fileData.sha;
      }
      
      // 2. Add new log entry
      logs.push(newLog);
      
      // 3. Save back to GitHub
      const content = Buffer.from(JSON.stringify(logs, null, 2)).toString('base64');
      
      const saveResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE_PATH}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Log: ${newLog.action} ${newLog.psSr} by ${newLog.userName}`,
            content: content,
            sha: sha,
            branch: 'main'
          })
        }
      );
      
      if (saveResponse.ok) {
        return res.status(200).json({ 
          success: true, 
          total: logs.length,
          message: `Log saved. Total entries: ${logs.length}`
        });
      } else {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save to GitHub');
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('write-log API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}