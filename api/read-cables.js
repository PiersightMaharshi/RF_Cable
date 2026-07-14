export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'PiersightMaharshi'; // 🔴 Change this
    const REPO_NAME = 'RF_Cable'; // 🔴 Change this
    const FILE_PATH = 'data/cables.csv';
    
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const csvText = await response.text();
    res.status(200).send(csvText);
    
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ error: error.message });
  }
}