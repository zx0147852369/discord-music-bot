# Discord Music Bot

บอท Discord เปิดเพลงจาก YouTube ในห้องเสียง (voice channel) รองรับคิวเพลง, ข้าม, วนซ้ำ, ปรับเสียง, มีเว็บแดชบอร์ดหลังบ้านสำหรับตั้งค่า และรันได้ตลอด 24 ชม. บน Railway

คำสั่งที่มี: `/play` `/skip` `/stop` `/pause` `/resume` `/queue` `/nowplaying` `/volume` `/loop` `/leave`

**เว็บแดชบอร์ด** (ล็อกอินด้วยรหัสผ่านเดียว) ให้ตั้งค่าต่อเซิร์ฟเวอร์ได้:
- ระดับเสียงเริ่มต้น และห้องข้อความที่ใช้แจ้งเพลงที่กำลังเล่น
- จำกัดสิทธิ์คำสั่งควบคุมเพลง (`/skip` `/stop` `/pause` `/resume` `/volume` `/loop` `/leave`) ให้เฉพาะ DJ role หรือแอดมิน
- เปิด/ปิดคำสั่งแต่ละตัวรายเซิร์ฟเวอร์
- ดูสถานะสดว่ากำลังเล่นเพลงอะไร อยู่ห้องเสียงไหน คิวมีอะไรบ้าง

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

ใส่ค่าเว็บแดชบอร์ดด้วย (ไม่งั้นแดชบอร์ดจะไม่เปิดใช้งาน):
- `DASHBOARD_PASSWORD` = ตั้งรหัสผ่านเอง (ใช้เข้าเว็บหน้าควบคุม)
- `SESSION_SECRET` = สร้างด้วยคำสั่ง `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` แล้ววางผลลัพธ์ลงไป

ลงทะเบียน slash command แล้วรันบอท:

```bash
npm run deploy-commands
npm start
```

เข้าห้องเสียงในเซิร์ฟเวอร์ แล้วพิมพ์ `/play` ตามด้วยชื่อเพลงหรือลิงก์ YouTube ทดสอบดู

เปิดเว็บแดชบอร์ดที่ http://localhost:3000 ล็อกอินด้วย `DASHBOARD_PASSWORD` ที่ตั้งไว้ แล้วเลือกเซิร์ฟเวอร์ทดสอบเพื่อดูหน้าตั้งค่า

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
3. **สร้าง Volume เก็บฐานข้อมูลถาวร** (ไม่งั้นการตั้งค่าจากเว็บจะหายทุกครั้งที่ redeploy): เข้า service → tab **Settings** → เลื่อนหา **Volumes** → **New Volume** → ตั้ง Mount Path เป็น `/data`
4. เข้า tab **Variables** ของ service แล้วเพิ่ม:
   - `DISCORD_TOKEN` = โทเคนจากขั้นตอนที่ 1
   - `CLIENT_ID` = Application ID จากขั้นตอนที่ 1
   - `DASHBOARD_PASSWORD` = รหัสผ่านสำหรับเข้าเว็บแดชบอร์ด (ตั้งเอง อย่าใช้ค่าเดา)
   - `SESSION_SECRET` = สุ่มด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `DB_PATH` = `/data/bot.sqlite` (ให้ตรงกับ Mount Path ของ Volume ที่สร้างไว้ข้อ 3)
   - `NODE_ENV` = `production`
   - (ไม่ต้องใส่ `GUILD_ID` ในโปรดักชัน ถ้าต้องการให้คำสั่งใช้ได้ทุกเซิร์ฟเวอร์ที่เชิญบอทเข้าไป — ถ้าใส่ไว้ คำสั่งจะลงทะเบียนเฉพาะเซิร์ฟเวอร์นั้นเซิร์ฟเวอร์เดียว)
5. **เปิดโดเมนสาธารณะสำหรับเว็บแดชบอร์ด**: เข้า tab **Settings** → **Networking** → **Generate Domain** จะได้ลิงก์ `https://xxxx.up.railway.app` ใช้เข้าแดชบอร์ด
6. Deploy จะรันคำสั่ง `npm start` ตามที่ตั้งไว้ใน `railway.json` — บอทจะออนไลน์และรันค้างไว้ตลอด (ตั้ง `restartPolicyType: ALWAYS` ไว้แล้ว ถ้าโปรเซสล่มจะรีสตาร์ทอัตโนมัติ)
7. ลงทะเบียน slash command แบบ global ครั้งแรก (ทำครั้งเดียวพอ ไม่ต้องรันซ้ำทุกครั้งที่ deploy เว้นแต่แก้ไข/เพิ่มคำสั่งใหม่): เปิด Railway service → tab **Settings** → **Deploy** → ใช้ Railway CLI หรือรันจากเครื่องตัวเองโดยตั้ง `.env` เป็นค่า production ชั่วคราวแล้วรัน `npm run deploy-commands` (คำสั่งลงทะเบียนที่ Discord API ไม่เกี่ยวกับว่ารันจากที่ไหน ขอแค่ token/client id ถูกต้อง)

**ใช้งานแดชบอร์ด**: เปิดลิงก์จากข้อ 5 → ล็อกอินด้วย `DASHBOARD_PASSWORD` → เลือกเซิร์ฟเวอร์ที่บอทอยู่ → ตั้งค่าแล้วกดบันทึก การตั้งค่าจะมีผลทันทีในการเล่นเพลงครั้งถัดไป (รหัสผ่านนี้เป็นรหัสเดียวคุมได้ทุกเซิร์ฟเวอร์ที่บอทอยู่ — เก็บให้ดี อย่าแชร์ให้คนที่ไม่ควรเข้าถึง)

หมายเหตุเรื่องรันตลอด 24 ชม.: บน Railway ตราบใดที่ service ยัง deploy อยู่และไม่ได้ถูกหยุด (sleep) โปรเซสจะรันค้างต่อเนื่อง ไม่ใช่เว็บที่ sleep เมื่อไม่มีคนเข้า (ต่างจาก hosting ฟรีบางเจ้า) แต่ถ้าใช้แผนฟรี/trial เครดิตอาจหมดได้ ควรอัปเกรดเป็นแผน Hobby ถ้าต้องการรันถาวรจริงจัง

## แก้ปัญหาที่พบบ่อย

- **บอทไม่เข้าห้องเสียง / ไม่มีเสียง**: ตรวจว่าบอทมีสิทธิ์ `Connect` และ `Speak` ในห้องเสียงนั้น
- **`/play` ค้นไม่เจอเพลง**: ลองใส่ลิงก์ YouTube เต็มแทนการค้นด้วยชื่อเพลง
- **แก้ไข/เพิ่มคำสั่งใหม่แล้วไม่เห็นการเปลี่ยนแปลง**: ต้องรัน `npm run deploy-commands` ใหม่ทุกครั้งที่แก้ไฟล์ใน `commands/`
