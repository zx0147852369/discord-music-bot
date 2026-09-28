# Discord Music Bot

บอท Discord เปิดเพลงจาก YouTube ในห้องเสียง (voice channel) รองรับคิวเพลง, ข้าม, วนซ้ำ, ปรับเสียง และรันได้ตลอด 24 ชม. บน Railway

คำสั่งที่มี: `/play` `/skip` `/stop` `/pause` `/resume` `/queue` `/nowplaying` `/volume` `/loop` `/leave`

## 1. สร้าง Discord Application + Bot

1. ไปที่ https://discord.com/developers/applications แล้วกด **New Application** ตั้งชื่อบอท
2. เข้าเมนู **Bot** (ด้านซ้าย) กด **Reset Token** เพื่อสร้างโทเคน แล้วคัดลอกเก็บไว้ (นี่คือ `DISCORD_TOKEN` — ห้ามแชร์ให้ใครเห็น)
3. ในหน้า Bot เลื่อนลงไปที่ **Privileged Gateway Intents** เปิด:
   - Server Members Intent (ไม่บังคับ แต่เปิดไว้ไม่เสียหาย)
   - Message Content Intent (ไม่จำเป็นสำหรับบอทนี้เพราะใช้ slash command แต่เปิดไว้ได้)
4. เข้าเมนู **General Information** คัดลอก **Application ID** เก็บไว้ (นี่คือ `CLIENT_ID`)
5. เข้าเมนู **OAuth2 → URL Generator**:
   - ติ๊ก scope: `bot` และ `applications.commands`
   - ติ๊ก permission: `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Use Slash Commands`, `View Channels`
   - คัดลอกลิงก์ที่สร้างขึ้นด้านล่าง แล้วเปิดในเบราว์เซอร์เพื่อเชิญบอทเข้าเซิร์ฟเวอร์ของคุณ

## 2. รันทดสอบในเครื่องตัวเอง (ไม่บังคับ แต่แนะนำ)

```bash
cd discord-music-bot
npm install
cp .env.example .env
```

เปิด `.env` แล้วใส่ `DISCORD_TOKEN`, `CLIENT_ID`, และ `GUILD_ID` (เอา Guild ID จากเซิร์ฟเวอร์ทดสอบ เพื่อให้ slash command อัปเดตทันทีตอนพัฒนา — คลิกขวาที่ไอคอนเซิร์ฟเวอร์ใน Discord แล้วเลือก Copy Server ID ต้องเปิด Developer Mode ก่อนใน User Settings → Advanced)

ลงทะเบียน slash command แล้วรันบอท:

```bash
npm run deploy-commands
npm start
```

เข้าห้องเสียงในเซิร์ฟเวอร์ แล้วพิมพ์ `/play` ตามด้วยชื่อเพลงหรือลิงก์ YouTube ทดสอบดู

## 3. อัปโหลดขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit: discord music bot"
```

สร้าง repo ใหม่บน https://github.com/new (แนะนำตั้งเป็น private เพราะเกี่ยวกับบอทของคุณเอง) แล้ว push:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**ห้าม commit ไฟล์ `.env`** (มี `.gitignore` กันไว้ให้แล้ว) — token ต้องตั้งค่าใน Railway โดยตรงเท่านั้น

## 4. Deploy บน Railway

1. ไปที่ https://railway.app แล้ว New Project → **Deploy from GitHub repo** เลือก repo นี้
2. Railway จะตรวจพบ Node.js อัตโนมัติผ่าน `railway.json` (nixpacks) — ไม่ต้องตั้งค่า build เพิ่ม
3. เข้า tab **Variables** ของ service แล้วเพิ่ม:
   - `DISCORD_TOKEN` = โทเคนจากขั้นตอนที่ 1
   - `CLIENT_ID` = Application ID จากขั้นตอนที่ 1
   - (ไม่ต้องใส่ `GUILD_ID` ในโปรดักชัน ถ้าต้องการให้คำสั่งใช้ได้ทุกเซิร์ฟเวอร์ที่เชิญบอทเข้าไป — ถ้าใส่ไว้ คำสั่งจะลงทะเบียนเฉพาะเซิร์ฟเวอร์นั้นเซิร์ฟเวอร์เดียว)
4. Deploy จะรันคำสั่ง `npm start` ตามที่ตั้งไว้ใน `railway.json` — บอทจะออนไลน์และรันค้างไว้ตลอด (ตั้ง `restartPolicyType: ALWAYS` ไว้แล้ว ถ้าโปรเซสล่มจะรีสตาร์ทอัตโนมัติ)
5. ลงทะเบียน slash command แบบ global ครั้งแรก (ทำครั้งเดียวพอ ไม่ต้องรันซ้ำทุกครั้งที่ deploy เว้นแต่แก้ไข/เพิ่มคำสั่งใหม่): เปิด Railway service → tab **Settings** → **Deploy** → ใช้ Railway CLI หรือรันจากเครื่องตัวเองโดยตั้ง `.env` เป็นค่า production ชั่วคราวแล้วรัน `npm run deploy-commands` (คำสั่งลงทะเบียนที่ Discord API ไม่เกี่ยวกับว่ารันจากที่ไหน ขอแค่ token/client id ถูกต้อง)

หมายเหตุเรื่องรันตลอด 24 ชม.: บน Railway ตราบใดที่ service ยัง deploy อยู่และไม่ได้ถูกหยุด (sleep) โปรเซสจะรันค้างต่อเนื่อง ไม่ใช่เว็บที่ sleep เมื่อไม่มีคนเข้า (ต่างจาก hosting ฟรีบางเจ้า) แต่ถ้าใช้แผนฟรี/trial เครดิตอาจหมดได้ ควรอัปเกรดเป็นแผน Hobby ถ้าต้องการรันถาวรจริงจัง

## แก้ปัญหาที่พบบ่อย

- **บอทไม่เข้าห้องเสียง / ไม่มีเสียง**: ตรวจว่าบอทมีสิทธิ์ `Connect` และ `Speak` ในห้องเสียงนั้น
- **`/play` ค้นไม่เจอเพลง**: ลองใส่ลิงก์ YouTube เต็มแทนการค้นด้วยชื่อเพลง
- **แก้ไข/เพิ่มคำสั่งใหม่แล้วไม่เห็นการเปลี่ยนแปลง**: ต้องรัน `npm run deploy-commands` ใหม่ทุกครั้งที่แก้ไฟล์ใน `commands/`
