import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";
import outsideSalesNames from "./data/contacts";
import hteLogo from "./assets/hte-logo.jpg";
import hteAddress from "./assets/hte-address.png";
import { PDFDocument } from "pdf-lib";
import lastTwoPagesPdf from "./assets/last two page.pdf";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";

const API = "http://localhost:5000";

function App() {
  const today = new Date().toLocaleDateString("en-US");

  const emptyForm = {
    date: "",
    bid_date: "N/A",
    contact: [],
    project: "",
    to_company: "",
    attention: "",
    location: "",
    status: "Not Started",
  };

  const emptyLineItem = {
    tag: "",
    vendor: "",
    qty: 1,
    description: "",
    list_price: 0,
    multiplier: 1,
    markup: 0,
    freight: 0,
    startup: 0,
    surcharge: 0,
    terms: "FFA",
    notes: "",
  };

  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [savedQuote, setSavedQuote] = useState(null);
  const [lineItemForm, setLineItemForm] = useState(emptyLineItem);
  const [editingLineItemId, setEditingLineItemId] = useState(null);
  const [activeQuoteId, setActiveQuoteId] = useState(null);

  const [draggedLineItem, setDraggedLineItem] = useState(null);

  const fetchQuotes = async () => {
    const res = await axios.get(`${API}/quotes`);
    setQuotes(res.data);
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

const formatMoney = (value) => {
  const num = Number(value || 0);

  if (num === 0) return ""; // ✅ hide $0.00

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
};

  const formatContact = (contact) => {
    if (!contact) return "";
    if (Array.isArray(contact)) return contact.join(", ");

    if (typeof contact === "string") {
      try {
        const parsed = JSON.parse(contact);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch {
        return contact
          .replace(/[\[\]{}"]/g, "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .join(", ");
      }
    }

    return "";
  };

  const normalizeContact = (contact) => {
    if (!contact) return [];
    if (Array.isArray(contact)) return contact;

    return contact
      .replace(/[\[\]{}"]/g, "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  };

  const quoteTotal = (quote) =>
    (quote.line_items || []).reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0
    );

  const quoteTermsText = (quote) => {
    const terms = [
      ...new Set((quote.line_items || []).map((item) => item.terms).filter(Boolean)),
    ];

    if (terms.length === 0) return "FFA ORIGIN";
    if (terms.length === 1) return `${terms[0]} ORIGIN`;
    return "TERMS VARY BY LINE ITEM";
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContactChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setForm({ ...form, contact: selected });
  };

  const handleLineItemChange = (e) => {
    setLineItemForm({ ...lineItemForm, [e.target.name]: e.target.value });
  };

  const handleSubmitQuote = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      contact: normalizeContact(form.contact),
    };

    if (editingId) {
      const res = await axios.put(`${API}/quotes/${editingId}`, payload);
      setSavedQuote(res.data);
      setEditingId(null);
    } else {
      const res = await axios.post(`${API}/quotes`, payload);
      setSavedQuote(res.data);
      setActiveQuoteId(res.data.id);
    }

    setForm(emptyForm);
    fetchQuotes();
  };



  const handleEditQuote = (quote) => {
    setEditingId(quote.id);
    setSavedQuote(quote);
    setActiveQuoteId(quote.id);

    setForm({
      date: quote.date || "",
      bid_date: quote.bid_date || "N/A",
      contact: normalizeContact(quote.contact),
      project: quote.project || "",
      to_company: quote.to_company || "",
      attention: quote.attention || "",
      location: quote.location || "",
      status: quote.status || "Not Started",
    });
  };

  const handleDeleteQuote = async (id) => {
    await axios.delete(`${API}/quotes/${id}`);
    fetchQuotes();

    if (savedQuote?.id === id) {
      setSavedQuote(null);
      setActiveQuoteId(null);
    }
  };

const roundToPreferred = (value) => {
  return Math.round(value);
};

  const handleSubmitLineItem = async (e) => {
  e.preventDefault();

  if (!activeQuoteId) {
    alert("Save or select a quote first before adding line items.");
    return;
  }

  // ✅ Convert values
  const list = Number(lineItemForm.list_price || 0);
  const multiplier = Number(lineItemForm.multiplier || 1);
  const markup = Number(lineItemForm.markup || 0);
  const freight = Number(lineItemForm.freight || 0);
  const startup = Number(lineItemForm.startup || 0);
  const surcharge = Number(lineItemForm.surcharge || 0);
  const qty = Number(lineItemForm.qty || 0);

const net_cost = list * (1 + surcharge) * multiplier;

const raw_sell = (net_cost * (1 + markup)) + freight + startup;

const sell_price = roundToPreferred(raw_sell);

const total_price = sell_price * qty;

  // ✅ attach calculated values
  const payload = {
    ...lineItemForm,
    net_cost: Number(net_cost.toFixed(2)),
    sell_price: Number(sell_price.toFixed(2)),
    total_price: Number(total_price.toFixed(2)),
  };

  if (editingLineItemId) {
    await axios.put(`${API}/line-items/${editingLineItemId}`, payload);
    setEditingLineItemId(null);
  } else {
    await axios.post(`${API}/quotes/${activeQuoteId}/line-items`, payload);
  }

  setLineItemForm(emptyLineItem);
  fetchQuotes();
};

  const handleEditLineItem = (quoteId, item) => {
    setActiveQuoteId(quoteId);
    setEditingLineItemId(item.id);

    setLineItemForm({
      tag: item.tag || "",
      vendor: item.vendor || "",
      qty: item.qty || 1,
      description: item.description || "",
      list_price: item.list_price || 0,
      multiplier: item.multiplier || 1,
      markup: item.markup || 0,
      freight: item.freight || 0,
      startup: item.startup || 0,
      surcharge: item.surcharge || 0,
      terms: item.terms || "FFA",
      notes: item.notes || "",
    });
  };

  const handleDeleteLineItem = async (id) => {
    await axios.delete(`${API}/line-items/${id}`);
    fetchQuotes();
  };


// const handleDropLineItem = async (quoteId, targetItemId) => {
//   if (!draggedLineItem) return;
//   if (draggedLineItem.quoteId !== quoteId) return;
//   if (draggedLineItem.itemId === targetItemId) return;

//   let newItemOrder = [];

//   setQuotes((prevQuotes) =>
//     prevQuotes.map((quote) => {
//       if (quote.id !== quoteId) return quote;

//       const items = [...(quote.line_items || [])];

//       const fromIndex = items.findIndex(
//         (item) => item.id === draggedLineItem.itemId
//       );

//       const toIndex = items.findIndex(
//         (item) => item.id === targetItemId
//       );

//       if (fromIndex === -1 || toIndex === -1) return quote;

//       const [movedItem] = items.splice(fromIndex, 1);

//       items.splice(toIndex, 0, movedItem);

//       newItemOrder = items.map((item) => item.id);

//       return {
//         ...quote,
//         line_items: items,
//       };
//     })
//   );

//   setDraggedLineItem(null);

//   if (newItemOrder.length > 0) {
//     await axios.put(
//       `${API}/quotes/${quoteId}/line-items/reorder`,
//       {
//         item_ids: newItemOrder,
//       }
//     );

//     fetchQuotes();
//   }
// };

const handleDropLineItem = async (quoteId, targetItemId) => {
  if (!draggedLineItem) return;
  if (draggedLineItem.quoteId !== quoteId) return;
  if (draggedLineItem.itemId === targetItemId) return;

  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) return;

  const items = [...(quote.line_items || [])];

  const fromIndex = items.findIndex((item) => item.id === draggedLineItem.itemId);
  const toIndex = items.findIndex((item) => item.id === targetItemId);

  if (fromIndex === -1 || toIndex === -1) return;

  const [movedItem] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, movedItem);

  const updatedItems = items.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));

  setQuotes((prevQuotes) =>
    prevQuotes.map((q) =>
      q.id === quoteId
        ? { ...q, line_items: updatedItems }
        : q
    )
  );

  setDraggedLineItem(null);

  await axios.put(`${API}/quotes/${quoteId}/line-items/reorder`, {
    item_ids: updatedItems.map((item) => item.id),
  });

  fetchQuotes();
};

  const printQuotePdf = async (quote, mode = "preview") => {
    const doc = new jsPDF("p", "pt", "letter");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 36;
    const marginRight = 36;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const totalPages = 3;

    // const pageHeader = () => {
    //   doc.addImage(hteLogo, "JPEG", marginLeft, 25, 120, 45);
    //   doc.addImage(hteAddress, "PNG", pageWidth - marginRight - 190, 25, 190, 45);
    // };
    const pageHeader = () => {
  doc.addImage(hteLogo, "JPEG", marginLeft, 20, 150, 55); // bigger logo
  // doc.addImage(hteAddress, "PNG", pageWidth - marginRight - 230, 20, 230, 55); // bigger address
  doc.addImage(hteAddress, "PNG", pageWidth - marginRight - 230, 38, 230, 55); // lower
};

    const pageFooter = (pageNum) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - marginRight, pageHeight - 20, {
        align: "right",
      });
    };

    const pdfQuoteTotal = quoteTotal(quote);

    const uniqueTerms = [
      ...new Set((quote.line_items || []).map((item) => item.terms).filter(Boolean)),
    ];

    const termsText =
      uniqueTerms.length === 1 ? `${uniqueTerms[0]} ORIGIN` : "TERMS VARY BY LINE ITEM";

    // PAGE 1
pageHeader();

const titleY = 110;
const topLineY = titleY - 18;
const bottomLineY = titleY + 8;

// doc.setDrawColor(47, 111, 99);
// doc.setLineWidth(1);
doc.setDrawColor(20, 80, 60); // darker green
doc.setLineWidth(2);          // thicker line
// doc.setDrawColor(15, 70, 50);
// doc.setLineWidth(2.5);

const tableLeft = marginLeft;
const tableRight = pageWidth - marginRight;

doc.line(tableLeft, topLineY, tableRight, topLineY);

doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("QUOTATION", pageWidth / 2, titleY, { align: "center" });

doc.line(tableLeft, bottomLineY, tableRight, bottomLineY);

let y = bottomLineY + 25;

autoTable(doc, {
  startY: y,
  margin: { left: marginLeft + 5, right: marginRight + 5 },
  theme: "grid",
  body: [
    ["DATE:", quote.date || "", "BID DATE:", quote.bid_date || ""],
    ["QUOTE #:", quote.quote_number || "", "TO:", quote.to_company || ""],
    ["CONTACT:", formatContact(quote.contact), "ATTENTION:", quote.attention || ""],
    ["PROJECT:", quote.project || "", "LOCATION:", quote.location || ""],
  ],
  styles: {
    font: "helvetica",
    fontSize: 9,
    cellPadding: 4,
    lineColor: [0, 0, 0],
    lineWidth: 0.6,
    textColor: [0, 0, 0],
    valign: "middle",
  },
columnStyles: {
  0: { cellWidth: 80, fontStyle: "bold", fillColor: [235, 235, 235] },
  1: { cellWidth: 180 },
  2: { cellWidth: 90, fontStyle: "bold", fillColor: [235, 235, 235] },
  3: { cellWidth: 180 },
},
});

y = doc.lastAutoTable.finalY + 20;

    doc.setFont("helvetica", "normal");
doc.setFontSize(7.2);

const paragraphGap = 7;
const lineHeight = 8.3;

const addParagraph = (text, options = {}) => {
  doc.setFont(
    "helvetica",
    options.style || "normal"
  );

  if (options.color) {
    doc.setTextColor(...options.color);
  } else {
    doc.setTextColor(0, 0, 0);
  }

  const lines = doc.splitTextToSize(text, contentWidth);
  doc.text(lines, marginLeft, y);
  y += lines.length * lineHeight + paragraphGap;

  doc.setTextColor(0, 0, 0);
};

// normal intro
addParagraph(
  "We are pleased to propose the following equipment for your consideration and subject to the engineer’s approval. Our proposal is limited only to that portion of the specifications concerning the equipment we have proposed per the sections and related paragraphs cited in our proposal. On all Heat Transfer Equipment Company’s quotations, where project plans and/or specifications have not been provided, we reserve the right to re-quote once the missing plans are provided to us."
);

// BOLD pricing paragraph
addParagraph(
  "Pricing is based upon the purchase of ALL equipment, per each manufacturer, on this quotation. If all equipment will not be ordered in full, price is subject to change. It is to not be assumed that any equipment or components, not explicitly written into this quote, even if they are within our scope, are included in the pricing of this quotation. Please discuss with your sales associate if any item is in question.",
  { style: "bold" }
);

// BOLD terms paragraph
addParagraph(
  "This quotation is in accordance with the Terms & Conditions listed at the end of this document – H.T.E. does not agree to accept other Terms & Conditions unless noted within this quotation.",
  { style: "bold" }
);

   // RED BOLD ITALIC tariff
addParagraph("Tariff Disclaimer:", {
  style: "bolditalic",
  color: [200, 0, 0],
});

addParagraph(
  "At Heat Transfer Equipment, we strive to provide accurate and competitive pricing based on the tariff rates, duties, government-imposed charges, and trade regulations in effect at the time this quote is issued. However, we recognize that global trade conditions and regulatory decisions can change unexpectedly and are outside of any of our control.",
  { style: "bolditalic", color: [200, 0, 0] }
);

addParagraph(
  "If new tariffs, duties, taxes, or similar charges are introduced, or if existing ones are modified by any government or regulatory authority (“Tariff Changes”), and these changes result in an increase to the cost of goods, we reserve the right to adjust the pricing of the affected items to reflect those changes.",
  { style: "bolditalic", color: [200, 0, 0] }
);

addParagraph(
  "Any tariff-related cost increases that take effect after the quote date will be communicated to you in advance of issuing the final invoice. We will always do our best to provide transparency and timely updates to help you make informed purchasing decisions.",
  { style: "bolditalic", color: [200, 0, 0] }
);

addParagraph(
  "If you have any questions or would like to better understand how potential tariff changes may impact your order, please don’t hesitate to contact your Heat Transfer Equipment sales representative. We truly appreciate your business and your understanding as we navigate these evolving conditions together.",
  { style: "bolditalic", color: [200, 0, 0] }
);

// green line after tariff
y += 3;
doc.setDrawColor(20, 80, 60);
doc.setLineWidth(2);
doc.line(marginLeft - 10, y, pageWidth - marginRight + 10, y);
y += 10;

doc.setTextColor(0, 0, 0);

doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.text(
  "NO SPECIFICATIONS PROVIDED",
  pageWidth / 2,
  y,
  { align: "center" }
);

y += 12;

autoTable(doc, {
  startY: y,
  margin: { left: marginLeft - 10, right: marginRight -10 },
  // theme: "grid",
  theme: "plain",
  head: [["TAG:", "QTY:", "DESCRIPTION:", "NET EACH", "EXT. TOTAL"]],
body: [...(quote.line_items || [])]
  .map((item) => [
  item.tag || "",
  Number(item.qty) > 0 ? item.qty : "",
  (item.description || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^|\n)-\s+/g, "$1• ")
    .trim(),
  formatMoney(item.sell_price),
  formatMoney(item.total_price),
]),
    

  styles: {
    font: "helvetica",
    fontSize: 8,
    cellPadding: 4,
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    halign: "left",
    // lineWidth: 0.4,
  },
  headStyles: {
    fillColor: [230, 230, 230],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
  },
  columnStyles: {
    // 0: { cellWidth: 80 },
    0: { cellWidth: 75, cellPadding: { left: 10, right: 4, top: 4, bottom: 4 } },
    1: { cellWidth: 40, halign: "center" },
    2: { cellWidth: 295, halign: "left" },
    3: { cellWidth: 75, halign: "center" },
    4: { cellWidth: 75, halign: "center", fontStyle: "bold" },
  },
  bodyStyles: {
    valign: "top",
  },

//   didParseCell: function (data) {

    
//   // DESCRIPTION column only
//   if (data.section === "body" && data.column.index === 2) {
//     const text = Array.isArray(data.cell.text)
//       ? data.cell.text.join(" ")
//       : String(data.cell.text || "");

//     // if contains bullet
//     if (text.includes("•")) {
//       data.cell.styles.fontStyle = "italic";
//     }
//   }
// },

// didParseCell: function (data) {
//   if (data.section === "body" && data.column.index === 2) {
//     const raw = String(data.row.raw[2] || "");

//     if (raw.includes("||")) {
//       // hide original text so custom text does not print twice
//       data.cell.styles.textColor = [255, 255, 255];
//     } else if (raw.includes("•")) {
//       // fallback: italicize full cell if no custom bold separator
//       data.cell.styles.fontStyle = "italic";
//     }
//   }
// },

didParseCell: function (data) {

  // reset every cell to normal first
  // data.cell.styles.fontStyle = "normal";

  // TAG column - hide only marked lines from autoTable
  if (data.section === "body" && data.column.index === 0) {
    const raw = String(data.cell.raw || "");

    data.cell.text = raw
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("!")) return " ";
        return line.trim();
      });
  }

  // DESCRIPTION column
// DESCRIPTION column
if (data.section === "body" && data.column.index === 2) {
  const raw = String(data.cell.raw || "");

  if (raw.includes("||")) {
    data.cell.text = data.cell.text.map((line) =>
      String(line).replace(/\|\|/g, "")
    );
  }

  data.cell.text = data.cell.text.map((line) => {
  if (String(line).trim().startsWith("•")) {
    return "   " + line;
  }
  return line;
});

}
},

didDrawCell: function (data) {


  // TAG column - yellow + bold only line with *
  if (data.section === "body" && data.column.index === 0) {
    const raw = String(data.row.raw[0] || "");
    const lines = raw.split("\n");

    const x = data.cell.x + 10;
    let y = data.cell.y + 8;
    const lineHeight = 8.5;

    lines.forEach((line) => {
      const isMarked = line.trim().startsWith("!");
      const cleanLine = line.replace(/^\!/, "").trim();

      if (isMarked && cleanLine) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        const textWidth = doc.getTextWidth(cleanLine);

        doc.setFillColor(255, 255, 0);
        doc.rect(x - 1, y - 6, textWidth + 3, 8, "F");

        doc.setTextColor(0, 0, 0);
        doc.text(cleanLine, x, y);
      }

      y += lineHeight;
    });
  }

  
  

//   if (data.section !== "body") return;
//   if (data.column.index !== 2) return;

//   // ✅ Do not custom-draw repeated/continued rows on new page
// if (data.cell.raw === undefined || data.cell.raw === null) return;

//   const raw = String(data.row.raw[2] || "");
//   if (!raw.includes("||")) return;

//   const [boldPart, ...restParts] = raw.split("||");
//   const boldText = boldPart.trim();
//   const normalText = restParts.join("||").trim();

//   const x = data.cell.x + 3;
//   let y = data.cell.y + 8;
//   const maxWidth = data.cell.width - 6;
//   const lineHeight = 8.5;

//   doc.setTextColor(0, 0, 0);

//   doc.setFont("helvetica", "bold");
//   doc.text(boldText, x, y);

//   const boldWidth = doc.getTextWidth(boldText + " ");

//   doc.setFont("helvetica", "normal");

//   const normalLines = doc.splitTextToSize(normalText, maxWidth - boldWidth);

//   if (normalLines.length > 0) {
//     doc.text(normalLines[0], x + boldWidth, y);
//   }

//   y += lineHeight;

  // const remainingText = normalLines.slice(1).join(" ");
  // const remainingLines = doc.splitTextToSize(remainingText, maxWidth);

  // remainingLines.forEach((line) => {
  //   const trimmed = line.trim();

  //   if (trimmed.startsWith("•")) {
  //     doc.setFont("helvetica", "italic");
  //   } else {
  //     doc.setFont("helvetica", "normal");
  //   }

  //   doc.text(line, x, y);
  //   y += lineHeight;
  // });
},

  

});

    y = doc.lastAutoTable.finalY + 18;

    y = doc.lastAutoTable.finalY + 6;

doc.setDrawColor(0, 0, 0);
doc.setLineWidth(0.7);
doc.line(marginLeft - 10, y, pageWidth - marginRight + 10, y);

y += 16;

doc.setFont("helvetica", "bold");
doc.setFontSize(8);

const priceNote1 = "PRICING DOES NOT INCLUDE SALES TAX";
const priceNote2 = `ALL EQUIPMENT HAS BEEN PRICED: ${termsText}`;

const drawHighlightedText = (text, yPos) => {
  const textWidth = doc.getTextWidth(text);
  const padding = 3;

  const x = pageWidth - marginRight - textWidth;

  // tight yellow highlight
  doc.setFillColor(255, 255, 0);
  doc.rect(
    x - padding,
    yPos - 6,
    textWidth + padding * 2,
    10,
    "F"
  );

  doc.setTextColor(0, 0, 0);
  doc.text(text, pageWidth - marginRight, yPos, { align: "right" });
};

// draw lines
drawHighlightedText(priceNote1, y);

y += 12;

drawHighlightedText(priceNote2, y);

y += 18;

doc.setFont("helvetica", "bold");
doc.setFontSize(12); // bigger

doc.text(`TOTAL: ${formatMoney(pdfQuoteTotal)}`, pageWidth - marginRight, y, {
  align: "right",
});

    // pageFooter(1);

   
    // pageFooter(2);


const quotePdfBytes = doc.output("arraybuffer");

const quotePdf = await PDFDocument.load(quotePdfBytes);

const lastPagesBytes = await fetch(lastTwoPagesPdf).then((res) =>
  res.arrayBuffer()
);

const lastPagesPdf = await PDFDocument.load(lastPagesBytes);

const copiedPages = await quotePdf.copyPages(
  lastPagesPdf,
  lastPagesPdf.getPageIndices()
);

copiedPages.forEach((page) => {
  quotePdf.addPage(page);
});

const finalPdfBytes = await quotePdf.save();

const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
const url = URL.createObjectURL(blob);

if (mode === "download") {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${quote.quote_number || "quote"}.pdf`;
  a.click();
} else {
  window.open(url, "_blank");
}

  }

const previewQuotePdf = async (quote) => {
  await printQuotePdf(quote, "preview");
};

const downloadQuotePdf = async (quote) => {
  await printQuotePdf(quote, "download");
};

  const selectedQuote = quotes.find((q) => q.id === activeQuoteId);

  const calculatedPreview = (() => {
  const list = Number(lineItemForm.list_price || 0);
  const multiplier = Number(lineItemForm.multiplier || 1);
  const markup = Number(lineItemForm.markup || 0);
  const freight = Number(lineItemForm.freight || 0);
  const startup = Number(lineItemForm.startup || 0);
  const surcharge = Number(lineItemForm.surcharge || 0);
  const qty = Number(lineItemForm.qty || 1);

const net = list * (1 + surcharge) * multiplier;

const rawSell = (net * (1 + markup)) + freight + startup;

const sell = roundToPreferred(rawSell);

const total = sell * qty;

  return { net, sell, total };
})();

const downloadQuoteWord = async (quote) => {
  const rows = [
    ["TAG", "QTY", "DESCRIPTION", "NET EACH", "EXT. TOTAL"],
    ...(quote.line_items || []).map((item) => [
      item.tag || "",
      String(item.qty || 1),
      item.description || "",
      formatMoney(item.sell_price),
      formatMoney(item.total_price),
    ]),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "QUOTATION", bold: true, size: 32 })],
            spacing: { after: 300 },
          }),

          new Paragraph(`Date: ${quote.date || ""}`),
          new Paragraph(`Quote #: ${quote.quote_number || ""}`),
          new Paragraph(`To: ${quote.to_company || ""}`),
          new Paragraph(`Attention: ${quote.attention || ""}`),
          new Paragraph(`Project: ${quote.project || ""}`),
          new Paragraph(`Location: ${quote.location || ""}`),
          new Paragraph(""),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph(String(cell || ""))],
                      })
                  ),
                })
            ),
          }),

          new Paragraph(""),
          new Paragraph({
            children: [
              new TextRun({
                text: `TOTAL: ${formatMoney(quoteTotal(quote))}`,
                bold: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${quote.quote_number || "quote"}.docx`;
  a.click();

  URL.revokeObjectURL(url);
};



  return (
    <div className="container">
      <h2>Quote Builder</h2>

      <form className="form" onSubmit={handleSubmitQuote}>
        <label>Contact:</label>
        <select name="contact" multiple value={form.contact} onChange={handleContactChange}>
          {outsideSalesNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <input name="project" placeholder="Project" value={form.project} onChange={handleChange} />
        <input name="to_company" placeholder="To" value={form.to_company} onChange={handleChange} />
        <input name="attention" placeholder="Attention" value={form.attention} onChange={handleChange} />
        <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
        <input
  name="date"
  placeholder="Quote Date"
  value={form.date}
  onChange={handleChange}
/>
        <input name="bid_date" placeholder="Bid Date" value={form.bid_date} onChange={handleChange} />

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Bid Submitted">Bid Submitted</option>
          <option value="Not Bidding">Not Bidding</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>

        <button className="btn primary">{editingId ? "Update Quote" : "Save Quote"}</button>
      </form>

      <h3>Current Quote Preview</h3>

      <table className="quote-table">
        <tbody>
          <tr>
            <td className="label">DATE:</td>
            <td className="value">{savedQuote?.date || today}</td>
            <td className="label">BID DATE:</td>
            <td className="value">{form.bid_date}</td>
          </tr>
          <tr>
            <td className="label">QUOTE #:</td>
            <td className="value">{savedQuote?.quote_number || "Generated after save"}</td>
            <td className="label">TO:</td>
            <td className="value">{form.to_company}</td>
          </tr>
          <tr>
            <td className="label">CONTACT:</td>
            <td className="value">{formatContact(form.contact)}</td>
            <td className="label">ATTENTION:</td>
            <td className="value">{form.attention}</td>
          </tr>
          <tr>
            <td className="label">PROJECT:</td>
            <td className="value">{form.project}</td>
            <td className="label">LOCATION:</td>
            <td className="value">{form.location}</td>
          </tr>
          <tr>
            <td className="label">STATUS:</td>
            <td className="value">{form.status}</td>
            <td className="label"></td>
            <td className="value"></td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h3>
        Line Items {selectedQuote ? `for ${selectedQuote.quote_number}` : "(save/select quote first)"}
      </h3>

<form className="line-item-form" onSubmit={handleSubmitLineItem}>

<label>Tag</label>

<textarea
  name="tag"
  placeholder={`Line 1
Line 2
Line 3`}
  value={lineItemForm.tag}
  onChange={handleLineItemChange}
  rows={4}
  className="tag-textarea"
/>

  <label>Vendor</label>
  <input name="vendor" placeholder="Vendor" value={lineItemForm.vendor} onChange={handleLineItemChange} />

  <label>Qty</label>
  <input name="qty" type="number" placeholder="Qty" value={lineItemForm.qty} onChange={handleLineItemChange} />

<textarea
  name="description"
  placeholder="Description"
  value={lineItemForm.description}
  onChange={handleLineItemChange}
  rows={3}
  style={{ resize: "vertical" }}
/>

  <label>List Price ($)</label>
  <input name="list_price" type="number" step="0.01" placeholder="List Price" value={lineItemForm.list_price} onChange={handleLineItemChange} />

  <label>Multiplier</label>
  <input name="multiplier" type="number" step="0.0001" placeholder="Multiplier" value={lineItemForm.multiplier} onChange={handleLineItemChange} />

  <label>Markup (decimal example .20)</label>
  <input name="markup" type="number" step="0.0001" placeholder="Markup" value={lineItemForm.markup} onChange={handleLineItemChange} />

  <label>Freight ($)</label>
  <input name="freight" type="number" step="0.01" placeholder="Freight" value={lineItemForm.freight} onChange={handleLineItemChange} />

  <label>Startup ($)</label>
  <input name="startup" type="number" step="0.01" placeholder="Startup" value={lineItemForm.startup} onChange={handleLineItemChange} />

  <label>Surcharge (decimal example .10 for 10%)</label>
  <input name="surcharge" type="number" step="0.01" placeholder="Surcharge" value={lineItemForm.surcharge} onChange={handleLineItemChange} />

  <label>Terms</label>
  <select name="terms" value={lineItemForm.terms} onChange={handleLineItemChange}>
    <option value="FFA">FFA</option>
    <option value="FOB">FOB</option>
  </select>

  <label>Notes</label>
  <input name="notes" placeholder="Notes" value={lineItemForm.notes} onChange={handleLineItemChange} />

  <div style={{ marginTop: "10px", fontWeight: "bold" }}>
    Net: {formatMoney(calculatedPreview.net)} | 
    Sell: {formatMoney(calculatedPreview.sell)} | 
    Total: {formatMoney(calculatedPreview.total)}
  </div>

  <button className="btn primary">
    {editingLineItemId ? "Update Line Item" : "Add Line Item"}
  </button>

</form>

      <hr />

      <h3>Saved Quotes</h3>

      {quotes.map((q) => (
        <div key={q.id} className="quote-card">
          <table className="quote-table">
            <tbody>
              <tr>
                <td className="label">DATE:</td>
                <td className="value">{q.date}</td>
                <td className="label">BID DATE:</td>
                <td className="value">{q.bid_date}</td>
              </tr>
              <tr>
                <td className="label">QUOTE #:</td>
                <td className="value">{q.quote_number}</td>
                <td className="label">TO:</td>
                <td className="value">{q.to_company}</td>
              </tr>
              <tr>
                <td className="label">CONTACT:</td>
                <td className="value">{formatContact(q.contact)}</td>
                <td className="label">ATTENTION:</td>
                <td className="value">{q.attention}</td>
              </tr>
              <tr>
                <td className="label">PROJECT:</td>
                <td className="value">{q.project}</td>
                <td className="label">LOCATION:</td>
                <td className="value">{q.location}</td>
              </tr>
              <tr>
                <td className="label">STATUS:</td>
                <td className="value">{q.status}</td>
                <td className="label"></td>
                <td className="value"></td>
              </tr>
            </tbody>
          </table>

          <div className="actions">
            <button className="btn secondary" onClick={() => setActiveQuoteId(q.id)}>Select</button>
            <button className="btn edit" onClick={() => handleEditQuote(q)}>Edit Quote</button>
            <button className="btn secondary" onClick={() => previewQuotePdf(q)}>Preview PDF</button>
            <button className="btn secondary" onClick={() => downloadQuotePdf(q)}>Download PDF</button>
            <button className="btn secondary" onClick={() => downloadQuoteWord(q)}>Download Word</button>
            <button className="btn delete" onClick={() => handleDeleteQuote(q.id)}>Delete Quote</button>
          </div>

          <table className="line-items-table">
            <thead>
              <tr>
                <th></th>
                <th>Tag</th>
                <th>Vendor</th>
                <th>Qty</th>
                <th>Description</th>
                <th>List</th>
                <th>Multiplier</th>
                <th>Markup</th>
                <th>Freight</th>
                <th>Startup</th>
                <th>Surcharge</th>
                <th>Net Cost</th>
                <th>Sell Price</th>
                <th>Terms</th>
                <th>Total</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
{[...(q.line_items || [])]
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  .map((item) => (
                <tr key={item.id}>
                  <td
  draggable
  onDragStart={() =>
    setDraggedLineItem({
      quoteId: q.id,
      itemId: item.id,
    })
  }
  onDragOver={(e) => e.preventDefault()}
  onDrop={() => handleDropLineItem(q.id, item.id)}
  style={{
    cursor: "grab",
    textAlign: "center",
    fontSize: "18px",
    userSelect: "none",
  }}
  title="Drag to reorder"
>
  ☰
</td>
                  <td>{item.tag}</td>
                  <td>{item.vendor}</td>
                  <td>{item.qty}</td>
                  <td>{item.description}</td>
                  <td>{formatMoney(item.list_price)}</td>
                  <td>{item.multiplier}</td>
                  <td>{item.markup}</td>
                  <td>{formatMoney(item.freight)}</td>
                  <td>{formatMoney(item.startup)}</td>
                 <td>{item.surcharge}</td>
<td>{formatMoney(item.net_cost)}</td>
<td>{formatMoney(item.sell_price)}</td>
<td>{item.terms}</td>
<td>{formatMoney(item.total_price)}</td>
                  <td>{item.notes}</td>
                  <td>
                    <button className="btn edit" onClick={() => handleEditLineItem(q.id, item)}>
                      Edit
                    </button>
                    <button className="btn delete" onClick={() => handleDeleteLineItem(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {(!q.line_items || q.line_items.length === 0) && (
                <tr>
                  <td colSpan="17">No line items yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}


export default App;
