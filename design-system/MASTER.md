# CDMS DESIGN SYSTEM - BRAND KIT & GUIDELINES

## 1. CORE BRAND IDENTITY (OLAM DIGITAL)
- **Primary Brand Colors:**
  - Olam Green: `#A0C800` (Main UI presence) [4]
  - Olam Dark Green: `#698714` (Depth & navigation) [4]
- **Neutral Base Colors:**
  - White Space: `#FFFFFF` (Must represent 60% of layout for clarity) [7, 10]
  - Cool Grey: `#7D7D7D` (Dividers & borders) [4]
  - Black: `#000000` (Primary text) [4]
- **Accent Palette (Used for buttons/status):**
  - Teal: `#00869D` | Orange: `#FD4E00` | Purple: `#760153` [11, 12]

## 2. TYPOGRAPHY SYSTEM
- **Headings & Titles:** Marianina Wide FY
  - Style: Bold/Medium
  - Tracking: 0 for Web UI headers [13]
- **Body & Data Copy:** Helvetica Neue (Roman or Light)
  - Purpose: Maximum legibility for dense data tables and reports [14, 15]
- **System Fallback:** Arial [16]

## 3. UI/UX STYLE (UI/UX PRO MAX PREFERENCE)
- **Style:** Minimalism & Swiss Style (Best for Enterprise/Dashboards) [5]
- **Dashboard Pattern:** Bento Box Grid (For modular dashboard cards) [5]
- **Analytics Style:** Data-Dense Dashboard (For complex reports) [6]
- **Interactive Elements:** Smooth transitions (200-300ms) and clear focus states [8]

## 4. STRICT FUNCTIONAL CONSTRAINTS (DO NOT BREAK)
- **Data Integrity:** Do NOT add, remove, or rename data fields. Use existing API hooks and data variables only.
- **Page Agency:** Maintain the existing navigation flow and relations between modals and parent pages.
- **Form Logic:** Keep the exact steps of multi-step forms. Redesign only the progress indicators and field styling.
- **No New Assets:** Do not introduce UI elements that require new backend data processing.

## 5. PHOTOGRAPHY & ICONOGRAPHY STYLE
- **Style:** Shallow depth of field, well-lit, showing real processing/logistics interactions [16, 17].
- **Icons:** Use SVG only (Lucide or Heroicons). No emojis [8].

## 6. PRE-DELIVERY CHECKLIST
- [ ] Contrast ratio minimum 4.5:1 (Light mode) [8]
- [ ] No emojis in UI components [8]
- [ ] cursor-pointer on all clickable elements [8]
- [ ] Responsive layouts: 375px, 768px, 1024px, 1440px [8]