#!/usr/bin/env python3
import json
import logging
import urllib.request
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Replace with your actual deployed raw JSON URL or repository raw path
JSON_URL = "https://raw.githubusercontent.com/Mohamed-Qadar/Somali-UniGuide-copilot-update-frontend-developer-cv-button/main/data/universities.json"
TELEGRAM_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_universities() -> list:
    """Fetch university data from the raw JSON file."""
    try:
        req = urllib.request.Request(
            JSON_URL,
            headers={"User-Agent": "Somali-UniGuide-Bot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("universities", [])
    except Exception as e:
        logger.error(f"Error fetching JSON data: {e}")
        return []


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command handler."""
    await update.message.reply_text(
        "👋 Somali-UniGuide Botuna Hoş Geldiniz!\n\n"
        "Somali'deki üniversiteler hakkında bilgi almak için bana bir şehir veya bölüm ismi yazın.\n\n"
        "Örnek sorgular:\n"
        "👉 'Mogadishu'\n"
        "👉 'Medicine'\n"
        "👉 'Engineering'"
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Message parser for searching universities."""
    query = update.message.text.lower().strip()
    
    # Send typing status
    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action="typing"
    )
    
    universities = get_universities()
    if not universities:
        await update.message.reply_text(
            "❌ Veriler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
        )
        return

    results = []
    for uni in universities:
        name = uni.get("name", "")
        city = uni.get("city", "")
        rector = uni.get("rector", "")
        website = uni.get("website", "")
        departments = uni.get("departments", [])

        # Match search term in name, city, or departments list
        match_city = query in city.lower()
        match_name = query in name.lower()
        match_dept = any(query in dept.lower() for dept in departments)

        if match_city or match_name or match_dept:
            depts_str = ", ".join(departments)
            results.append(
                f"🏫 *{name}*\n"
                f"📍 Şehir: {city}\n"
                f"👤 Rektör: {rector}\n"
                f"🌐 Web: {website}\n"
                f"📚 Bölümler: {depts_str}"
            )

    if results:
        # Send top 8 matches to keep Telegram messages concise
        response_text = f"🔍 *Aradığınız Kriterlere Göre {len(results)} Üniversite Bulundu:*\n\n"
        response_text += "\n\n---\n\n".join(results[:8])
        if len(results) > 8:
            response_text += "\n\n⚠️ *Diğer sonuçlar için web sitemizi ziyaret edin.*"
        await update.message.reply_text(response_text, parse_mode="Markdown")
    else:
        await update.message.reply_text(
            "🤷 Sonuç bulunamadı. Lütfen başka bir anahtar kelime deneyin (Örn: 'Borama', 'Medicine')."
        )


def main():
    """Main execution function."""
    if TELEGRAM_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN":
        logger.warning(
            "Please configure your TELEGRAM_TOKEN in scripts/bot.py before running."
        )
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    logger.info("Starting Telegram Bot...")
    app.run_polling()


if __name__ == "__main__":
    main()
