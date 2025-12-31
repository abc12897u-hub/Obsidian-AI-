import { GitHubConfig } from "../types";

export const syncToGitHub = async (
  config: GitHubConfig, 
  filename: string, 
  content: string
): Promise<string> => {
  if (!config.token || !config.owner || !config.repo) {
    throw new Error("缺少 GitHub 設定配置。");
  }

  const path = config.path ? `${config.path.replace(/\/$/, '')}/${filename}` : filename;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

  try {
    // 1. Check if file exists to get SHA (for update)
    const checkResponse = await fetch(url, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    let sha: string | undefined;

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      sha = data.sha;
    }

    // 2. Encode content to Base64 (handling UTF-8)
    // Using a reliable utf-8 to base64 conversion
    const utf8Bytes = new TextEncoder().encode(content);
    let binaryString = "";
    utf8Bytes.forEach((byte) => (binaryString += String.fromCharCode(byte)));
    const base64Content = btoa(binaryString);

    // 3. Create or Update file
    const body: any = {
      message: `每日簡報: ${filename} (透過 Obsidian AI Sync)`,
      content: base64Content,
    };

    if (sha) {
      body.sha = sha;
    }

    const putResponse = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      throw new Error(`GitHub API 錯誤: ${errorData.message}`);
    }

    const responseData = await putResponse.json();
    return responseData.content.html_url;

  } catch (error) {
    console.error("GitHub Sync Error:", error);
    throw error;
  }
};