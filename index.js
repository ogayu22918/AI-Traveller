import OpenAI from 'openai';
import readline from 'readline/promises';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

// Azure OpenAI APIの設定 (Pythonサンプルに合わせた環境変数名)
const endpointUrl = process.env.ENDPOINT_URL;
const deploymentName = process.env.DEPLOYMENT_NAME;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
// APIバージョンは環境変数またはPythonサンプルに合わせてデフォルト値を設定
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-05-01-preview";

if (!endpointUrl || !deploymentName || !apiKey) {
  console.error("エラー: 環境変数に必要な Azure OpenAI の設定がされていません。");
  console.error("ENDPOINT_URL, DEPLOYMENT_NAME, AZURE_OPENAI_API_KEY を設定してください。");
  process.exit(1);
}

// OpenAIクライアントの初期化 (Azure向け)
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: `${endpointUrl}openai/deployments/${deploymentName}`, // エンドポイントとデプロイメント名を結合
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: { 'api-key': apiKey },
});

// 会話履歴を保存する配列
const conversationMessages = [
  {
    role: "system",
    content: "あなたは親切なAIアシスタントです。",
  },
];

// 会話ログを保存するファイル名
const logFileName = `conversation_log_nodejs_${new Date().toISOString().replace(/:/g, '-')}.txt`;

// readlineインターフェースの作成
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 会話内容をファイルに記録する関数
async function logConversation(role, content) {
  const logEntry = `${new Date().toISOString()} [${role.toUpperCase()}]: ${content}\n`;
  try {
    await fs.appendFile(logFileName, logEntry);
  } catch (err) {
    console.error('ファイルへのログ記録中にエラーが発生しました:', err);
  }
}

// メインの会話ループ関数
async function chatLoop() {
  try {
    const userInput = await rl.question("あなた: ");

    if (userInput.toLowerCase() === "終了" || userInput.toLowerCase() === "exit") {
      console.log("会話を終了します。お疲れ様でした！");
      await logConversation("System", "会話がユーザーによって終了されました。");
      rl.close();
      return;
    }

    conversationMessages.push({ role: "user", content: userInput });
    await logConversation("user", userInput);

    console.log("AIが応答を生成中...");

    // 入力候補を生成する (Pythonサンプルに合わせたパラメータ)
    const completion = await client.chat.completions.create({
      messages: conversationMessages,
      // model: deploymentName, // baseURLでデプロイメント名が指定されているため、通常Azureでは不要
      max_tokens: 800,
      temperature: 0.7,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: null, // JavaScriptでは null または未指定
      stream: false,
    });

    // デバッグ用にAPIレスポンス全体をJSON形式で表示 (Pythonサンプルの print(completion.to_json()) に相当)
    // console.log("API Response JSON:", JSON.stringify(completion, null, 2));

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (aiResponse) {
      console.log(`AI: ${aiResponse}`);
      conversationMessages.push({ role: "assistant", content: aiResponse });
      await logConversation("assistant", aiResponse);
    } else {
      console.log("AIから有効な応答が得られませんでした。");
      await logConversation("System", "AIから有効な応答が得られませんでした。");
    }

  } catch (error) {
    console.error("エラーが発生しました:", error.response?.data || error.message || error);
    await logConversation("System", `エラー: ${error.response?.data || error.message || error}`);
  }

  chatLoop(); // 会話を継続
}

// プログラム開始時の処理
async function startChat() {
  console.log("Azure OpenAI との会話を開始します (Node.js版)。'終了'または'exit'で終了します。");
  console.log(`会話ログは ${logFileName} に保存されます。`);
  await logConversation("System", "会話セッション開始 (Node.js)");
  chatLoop();
}

startChat();