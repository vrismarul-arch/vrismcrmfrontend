import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import Logo from '../../assets/vrism.png';

// --- Helper functions ---
const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `₹${numAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const convertNumberToWords = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "N/A";

    let integerPart = Math.floor(num);
    let decimalPart = Math.round((num - integerPart) * 100);

    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Lakh", "Crore"];

    const convertLessThanOneThousand = (n) => {
        if (n === 0) return "";
        let result = "";
        if (n >= 100) {
            result += units[Math.floor(n / 100)] + " Hundred";
            n %= 100;
            if (n > 0) result += " ";
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)];
            n %= 10;
            if (n > 0) result += " ";
        }
        if (n >= 10) {
            result += teens[n - 10];
        } else if (n > 0) {
            result += units[n];
        }
        return result.trim();
    };

    let words = [];
    if (integerPart === 0) {
        words.push("Zero");
    } else {
        let currentNum = integerPart;
        let scaleIndex = 0;
        const indianScales = [
            { limit: 1000, name: "" },
            { limit: 100, name: "Thousand" },
            { limit: 100, name: "Lakh" },
            { limit: 100, name: "Crore" }
        ];

        let tempWords = [];
        for (let i = 0; i < indianScales.length && currentNum > 0; i++) {
            let chunk;
            if (i === 0) {
                chunk = currentNum % indianScales[i].limit;
                currentNum = Math.floor(currentNum / indianScales[i].limit);
            } else {
                chunk = currentNum % 100;
                currentNum = Math.floor(currentNum / 100);
            }
            if (chunk > 0) {
                tempWords.push(convertLessThanOneThousand(chunk) + (indianScales[i].name ? " " + indianScales[i].name : ""));
            }
        }
        words = tempWords.reverse().filter(Boolean);
    }

    const finalWords = words.join(" ").trim();
    let result = finalWords ? finalWords + " Rupees" : "Zero Rupees";

    if (decimalPart > 0) {
        result += ` and ${convertLessThanOneThousand(decimalPart)} Paisa`;
    }
    result += " Only";

    return result.replace(/\s+/g, ' ');
};

// --- PDF Styling Constants ---
const pdfStyles = {
    font: {
        family: "helvetica",
        normal: "normal",
        bold: "bold",
    },
    colors: {
        primary: "#D35400",
        text: "#333",
        footer: "#999",
        headerBg: "#f2f2f2",
        tableBorder: "#000000",
    },
    fontSize: {
        companyName: 14,
        taglineText: 9,
        addressText: 8,
        mainContent: 10,
        sectionTitle: 12,
        tableHeader: 9,
        tableContent: 8,
        summaryText: 9,
        footer: 8,
    },
    spacing: {
        padding: 15,
        lineHeight: 5,
        smallLineHeight: 3.5,
        headerHeight: 45,
        footerHeight: 15,
        cellPadding: 2,
        sectionGap: 10,
    },
    lines: {
        header: 0.5,
        table: 0.2,
        box: 0.1,
    },
};

export const downloadQuotationPdf = async (record) => {
    const toastId = toast.loading("Generating PDF...", {
        position: "top-center",
    });

    try {
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        let y = pdfStyles.spacing.padding;

        const addHeader = async () => {
            const img = new Image();
            img.src = Logo;
            await new Promise(resolve => img.onload = resolve);
            const imgWidth = 20;
            const imgHeight = (img.height * imgWidth) / img.width;
            const imgX = pdfStyles.spacing.padding;
            const imgY = pdfStyles.spacing.padding;
            pdf.addImage(img, 'PNG', imgX, imgY, imgWidth, imgHeight);
            pdf.setFontSize(pdfStyles.fontSize.companyName);
            pdf.setTextColor(pdfStyles.colors.primary);
            pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
            pdf.text("VR INDUSTRIAL SOLUTIONS & MACHINERY", pdfWidth / 2, pdfStyles.spacing.padding + 5, { align: "center" });
            pdf.setFontSize(pdfStyles.fontSize.taglineText);
            pdf.setTextColor(pdfStyles.colors.primary);
            pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
            pdf.text("(Authorized Partner of Mega Cranes India Pvt Ltd)", pdfWidth / 2, pdfStyles.spacing.padding + 9, { align: "center" });
            pdf.setFontSize(pdfStyles.fontSize.addressText);
            pdf.setTextColor(pdfStyles.colors.text);
            pdf.text("Factory Address: Plot No. 132, Surappa Gounder Street, Lakshmi Nagar,", pdfWidth / 2, pdfStyles.spacing.padding + 15, { align: "center" });
            pdf.text("Vellalur, Coimbatore - 641111", pdfWidth / 2, pdfStyles.spacing.padding + 18, { align: "center" });
            pdf.text("Office Address: 64/1, Balaji Nagar, Kalapatti Road, Saravanampatti,", pdfWidth / 2, pdfStyles.spacing.padding + 21, { align: "center" });
            pdf.text("Coimbatore - 641035", pdfWidth / 2, pdfStyles.spacing.padding + 24, { align: "center" });
            pdf.text("Mobile: 95004 76026, 90035 76026", pdfWidth / 2, pdfStyles.spacing.padding + 27, { align: "center" });
            pdf.text("Email: info@vrism.in, sales@vrism.in", pdfWidth / 2, pdfStyles.spacing.padding + 30, { align: "center" });
            pdf.text("Website: www.vrism.in", pdfWidth / 2, pdfStyles.spacing.padding + 33, { align: "center" });
            pdf.text("GSTIN: 33BZRPS7627F1Z5", pdfWidth / 2, pdfStyles.spacing.padding + 36, { align: "center" });
            pdf.setDrawColor(pdfStyles.colors.primary);
            pdf.setLineWidth(pdfStyles.lines.header);
            pdf.line(pdfStyles.spacing.padding, pdfStyles.spacing.padding + 40, pdfWidth - pdfStyles.spacing.padding, pdfStyles.spacing.padding + 40);
            y = pdfStyles.spacing.padding + 45;
        };

        const addFooter = (pageNumber, totalPages) => {
            pdf.setFontSize(pdfStyles.fontSize.footer);
            pdf.setTextColor(pdfStyles.colors.footer);
            pdf.text(`Page ${pageNumber}/${totalPages}`, pdfWidth / 2, pdfHeight - pdfStyles.spacing.footerHeight + 5, { align: "center" });
        };

        const subTotalAmount = record.items?.reduce(
            (sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)),
            0
        ) || 0;
        const gstRate = 0.18;
        const gstAmount = subTotalAmount * gstRate;
        const grandTotalAmount = subTotalAmount + gstAmount;

        const quotationContent = {
            toCompany: record.businessName || "M/s. LMW Limited, Foundry Division UNIT - 31 (Unit 2), Arasur, Coimbatore – 641 407",
            attnContact: record.businessId?.contactName || record.contactName || "N/A",
            attnMobile: record.mobileNumber || record.businessId?.mobileNumber || record.businessId?.phone || "N/A",
            attnEmail: record.businessId?.email || record.email || "N/A",
            subject: record.subject || (() => {
                const itemDescriptions = record.items?.map(item => item.productName).filter(Boolean);
                if (itemDescriptions && itemDescriptions.length > 0) {
                    let s = `Offer for ${itemDescriptions.slice(0, 2).join(' & ')}`;
                    if (itemDescriptions.length > 2) s += '...';
                    return s;
                }
                return "Offer for your requirement";
            })(),
            reference: record.reference || `Your telecom enquiry dated ${new Date().toLocaleDateString("en-IN")}`,
            quotationDate: record.date ? new Date(record.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
            quotationNumber: record.quotationNumber || "VRISM/OFR/0/NXL",
            quotationNotes: record.quotationNotes || "If Installation or any other Service is required, additional charges of Rs.4,500/- will be Applicable extra on PER MAN DAY (i.e, Per Engineer Per Day) basis + GST 18% Extra. If required, you have to release a separate Work Order",
            customerScope: record.customerScope || `Transportation from our works to your site\nUnloading the materials @Site, Storage, Security, Inhouse Transportation\nRequired Cables, SFU, Ladders, Scaffoldings, Platforms, Cranes, Chain Block other requirements for Installation.\nInstallation with Required Base & Cables, Materials & Modifications\nAdditional Materials, Spares, Modifications & Services (if required)`,
            hsnCodes: record.hsnCodes || Array.from(new Set(
                record.items?.map(item => item.hsnSac).filter(hsn => hsn && hsn.trim() !== '')
            )).join(', ') || "Spares - 84311090, Service - 998719",
            termsData: [
                { label: "PRICES", value: record.pricesTerms || "EX WORKS COIMBATORE with open packing basis." },
                { label: "TAXES", value: record.warranty || "12 months from the date of dispatch or 1000 running hours whichever is earlier." },
                { label: "PAYMENT TERMS", value: record.ourPaymentTerms || "100% payment + 100% GST before dispatch from our works" },
                { label: "DELIVERY", value: record.delivery || "4 - 6 weeks against receipt of your firm PO" },
                { label: "PACKING & FORWARDING CHARGES", value: record.packingForwardingCharges || "NA" },
                { label: "TRANSPORTATION CHARGES", value: record.transportationCharges || "Customer's scope" },
                { label: "TRANSPORTER NAME", value: record.transporterName || "Customer's Vehicle" },
                { label: "MODE & PLACE OF DELIVERY", value: record.modePlaceDelivery || "EX WORKS" },
                { label: "VALIDITY", value: record.offerValidity || "30 days from the date of this offer." },
            ],
        };
        quotationContent.termsData.push({ label: "HSN CODES", value: quotationContent.hsnCodes });

        await addHeader();
        pdf.setFontSize(pdfStyles.fontSize.mainContent);
        pdf.setTextColor(pdfStyles.colors.text);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text(quotationContent.quotationNumber, pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("To,", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text(`M/s ${quotationContent.toCompany}`, pdfStyles.spacing.padding, y);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        y += pdfStyles.spacing.lineHeight;
        pdf.text(`KIND ATTN: ${quotationContent.attnContact}`, pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.text(`Mobile: ${quotationContent.attnMobile}`, pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.text(`E-mail: ${quotationContent.attnEmail}`, pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text(`SUB: ${quotationContent.subject}`, pdfStyles.spacing.padding, y);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        y += pdfStyles.spacing.lineHeight;
        pdf.text(`REF: ${quotationContent.reference}`, pdfStyles.spacing.padding, y);
        pdf.text(`DATE: ${quotationContent.quotationDate}`, pdfWidth - pdfStyles.spacing.padding, pdfStyles.spacing.padding + 45, { align: "right" });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text("Dear Customer,", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text("We thank you for enquiry, we are pleased to submit our Techno Commercial Offer, as under.", pdfStyles.spacing.padding, y, { maxWidth: pdfWidth - 2 * pdfStyles.spacing.padding });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("We, \"VR Industrial Solutions & Machinery\" is an Authorized Partner of \"Mega Cranes India Pvt Ltd\", a Promising & Reliable Original Equipment Manufacturer of Overhead Cranes and Electric Wire Rope Hoist in South India, situated at Coimbatore more than a decade.", pdfStyles.spacing.padding, y, { maxWidth: pdfWidth - 2 * pdfStyles.spacing.padding });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("We are also an Authorized Crane Partner of \"KITO\" Japan for Electric Chain Hoist, Manual Hoist, Rope Hoist. KITO is the Worlds No.1 Chain Hoist manufacturer.", pdfStyles.spacing.padding, y, { maxWidth: pdfWidth - 2 * pdfStyles.spacing.padding });
        y += pdfStyles.spacing.lineHeight * 4;
        pdf.setFontSize(pdfStyles.fontSize.sectionTitle);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text("Annexure I - Price & Scope Details", pdfWidth / 2, y, { align: "center" });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("Annexure II - Terms & Conditions", pdfWidth / 2, y, { align: "center" });
        pdf.setFontSize(pdfStyles.fontSize.mainContent);
        y += pdfStyles.spacing.lineHeight * 4;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text("We hope you will find our offer most competitive, if you have clarifications, please feel free to contact us.", pdfStyles.spacing.padding, y, { maxWidth: pdfWidth - 2 * pdfStyles.spacing.padding });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("Looking forward for your valued order at the earliest.", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.text("Yours Faithfully", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text("For VR INDUSTRIAL SOLUTIONS & MACHINERY", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 3;
        pdf.text("V. Sivaraman", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text("Proprietor", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.text("+91 95004 76026", pdfStyles.spacing.padding, y);
        let pageCount = pdf.internal.getNumberOfPages();
        pdf.addPage();
        y = pdfStyles.spacing.padding;
        await addHeader();
        pdf.setFontSize(pdfStyles.fontSize.sectionTitle);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        y += pdfStyles.spacing.lineHeight;
        pdf.text("ANNEXURE - I (PRICE & SCOPE)", pdfWidth / 2, y, { align: "center" });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFontSize(pdfStyles.fontSize.tableHeader);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        const tableStartX = pdfStyles.spacing.padding;
        let tableY = y;
        const totalTableWidth = pdfWidth - 2 * pdfStyles.spacing.padding;
        const colWidthDesc = totalTableWidth * 0.45;
        const colWidthUnit = totalTableWidth * 0.20;
        const colWidthQty = totalTableWidth * 0.17;
        const colWidthTotal = totalTableWidth * 0.18;
        const headerRowHeight = 7;
        pdf.setFillColor(pdfStyles.colors.headerBg);
        pdf.rect(tableStartX, tableY, totalTableWidth, headerRowHeight, "F");
        pdf.setDrawColor(pdfStyles.colors.tableBorder);
        pdf.setLineWidth(pdfStyles.lines.table);
        pdf.text("DESCRIPTION", tableStartX + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
        pdf.text("UNIT PRICE", tableStartX + colWidthDesc + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
        pdf.text("QTY", tableStartX + colWidthDesc + colWidthUnit + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
        pdf.text("TOTAL PRICE", tableStartX + colWidthDesc + colWidthUnit + colWidthQty + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
        pdf.rect(tableStartX, tableY, colWidthDesc, headerRowHeight);
        pdf.rect(tableStartX + colWidthDesc, tableY, colWidthUnit, headerRowHeight);
        pdf.rect(tableStartX + colWidthDesc + colWidthUnit, tableY, colWidthQty, headerRowHeight);
        pdf.rect(tableStartX + colWidthDesc + colWidthUnit + colWidthQty, tableY, colWidthTotal, headerRowHeight);
        tableY += headerRowHeight;
        pdf.setFontSize(pdfStyles.fontSize.tableContent);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);

        for (const item of record.items || []) {
            const description = item.description || item.productName || 'N/A';
            const unitPrice = parseFloat(item.rate || 0);
            const quantity = parseFloat(item.quantity || 0);
            const totalPrice = unitPrice * quantity;
            const descriptionLines = pdf.splitTextToSize(description, colWidthDesc - 2 * pdfStyles.spacing.cellPadding);
            const descriptionHeight = descriptionLines.length * pdfStyles.spacing.lineHeight;
            const actualRowHeight = Math.max(headerRowHeight, descriptionHeight + 2 * pdfStyles.spacing.cellPadding);

            if (tableY + actualRowHeight + pdfStyles.spacing.footerHeight + pdfStyles.spacing.padding > pdfHeight - pdfStyles.spacing.footerHeight) {
                pageCount = pdf.internal.getNumberOfPages();
                addFooter(pageCount, "N/A");
                pdf.addPage();
                y = pdfStyles.spacing.padding;
                await addHeader();
                pdf.setFontSize(pdfStyles.fontSize.sectionTitle);
                pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
                y += pdfStyles.spacing.lineHeight;
                pdf.text("ANNEXURE - I (PRICE & SCOPE) - Continued", pdfWidth / 2, y, { align: "center" });
                y += pdfStyles.spacing.lineHeight * 2;
                tableY = y;
                pdf.setFontSize(pdfStyles.fontSize.tableHeader);
                pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
                pdf.setFillColor(pdfStyles.colors.headerBg);
                pdf.rect(tableStartX, tableY, totalTableWidth, headerRowHeight, "F");
                pdf.setDrawColor(pdfStyles.colors.tableBorder);
                pdf.setLineWidth(pdfStyles.lines.table);
                pdf.text("DESCRIPTION", tableStartX + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
                pdf.text("UNIT PRICE", tableStartX + colWidthDesc + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
                pdf.text("QTY", tableStartX + colWidthDesc + colWidthUnit + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
                pdf.text("TOTAL PRICE", tableStartX + colWidthDesc + colWidthUnit + colWidthQty + pdfStyles.spacing.cellPadding, tableY + headerRowHeight / 2, { align: "left", baseline: "middle" });
                pdf.rect(tableStartX, tableY, colWidthDesc, headerRowHeight);
                pdf.rect(tableStartX + colWidthDesc, tableY, colWidthUnit, headerRowHeight);
                pdf.rect(tableStartX + colWidthDesc + colWidthUnit, tableY, colWidthQty, headerRowHeight);
                pdf.rect(tableStartX + colWidthDesc + colWidthUnit + colWidthQty, tableY, colWidthTotal, headerRowHeight);
                tableY += headerRowHeight;
                pdf.setFontSize(pdfStyles.fontSize.tableContent);
                pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
            }

            pdf.rect(tableStartX, tableY, colWidthDesc, actualRowHeight);
            pdf.rect(tableStartX + colWidthDesc, tableY, colWidthUnit, actualRowHeight);
            pdf.rect(tableStartX + colWidthDesc + colWidthUnit, tableY, colWidthQty, actualRowHeight);
            pdf.rect(tableStartX + colWidthDesc + colWidthUnit + colWidthQty, tableY, colWidthTotal, actualRowHeight);
            const textYOffset = (actualRowHeight - (descriptionLines.length * pdfStyles.spacing.lineHeight)) / 2 + pdfStyles.spacing.cellPadding;
            const singleLineTextYOffset = actualRowHeight / 2;
            pdf.text(descriptionLines, tableStartX + pdfStyles.spacing.cellPadding, tableY + textYOffset);
            pdf.text(formatCurrency(unitPrice), tableStartX + colWidthDesc + pdfStyles.spacing.cellPadding, tableY + singleLineTextYOffset, { align: "left", baseline: "middle" });
            pdf.text(String(quantity), tableStartX + colWidthDesc + colWidthUnit + pdfStyles.spacing.cellPadding, tableY + singleLineTextYOffset, { align: "left", baseline: "middle" });
            pdf.text(formatCurrency(totalPrice), tableStartX + colWidthDesc + colWidthUnit + colWidthQty + pdfStyles.spacing.cellPadding, tableY + singleLineTextYOffset, { align: "left", baseline: "middle" });
            tableY += actualRowHeight;
        }

        // Summary Rows
        const summaryRowHeight = 7;
        pdf.setFontSize(pdfStyles.fontSize.summaryText);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);

        // --- Corrected Alignment Logic ---
        // Calculate the right edge of the QTY column for the labels
        const labelColumnX = tableStartX + colWidthDesc + colWidthUnit + colWidthQty; 
        // Calculate the right edge of the TOTAL PRICE column for the values
        const valueColumnX = tableStartX + totalTableWidth; 

        // Sub Total
        if (tableY + summaryRowHeight > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
            tableY = y;
        }
        pdf.rect(tableStartX, tableY, totalTableWidth, summaryRowHeight);
        pdf.text("SUB TOTAL", labelColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        pdf.text(formatCurrency(subTotalAmount), valueColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        tableY += summaryRowHeight;

        // GST
        if (tableY + summaryRowHeight > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
            tableY = y;
        }
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal); // Font for GST label
        pdf.rect(tableStartX, tableY, totalTableWidth, summaryRowHeight);
        pdf.text("TAXES - GST 18%", labelColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        pdf.text(formatCurrency(gstAmount), valueColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        tableY += summaryRowHeight;

        // Grand Total
        if (tableY + summaryRowHeight > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
            tableY = y;
        }
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold); // Font for Grand Total label
        pdf.rect(tableStartX, tableY, totalTableWidth, summaryRowHeight);
        pdf.text("GRAND TOTAL", labelColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        pdf.text(formatCurrency(grandTotalAmount), valueColumnX - pdfStyles.spacing.cellPadding, tableY + summaryRowHeight / 2, { align: "right", baseline: "middle" });
        y = tableY + summaryRowHeight + pdfStyles.spacing.sectionGap;

        // Total in words
        pdf.setFontSize(pdfStyles.fontSize.summaryText);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        const totalWordsText = convertNumberToWords(grandTotalAmount);
        const textLines = pdf.splitTextToSize(`Amount in words: ${totalWordsText}`, pdfWidth - 2 * pdfStyles.spacing.padding - 20);
        y += pdfStyles.spacing.lineHeight;
        if (y + (textLines.length * pdfStyles.spacing.lineHeight) > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
        }
        pdf.text(`Amount in words:`, pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.text(textLines, pdfStyles.spacing.padding + 10, y);
        y += (textLines.length * pdfStyles.spacing.lineHeight) + 5;

        // Notes and Customer's Scope Box
        const boxPadding = 5;
        const boxStartX = pdfStyles.spacing.padding;
        const boxWidth = pdfWidth - 2 * pdfStyles.spacing.padding;
        const noteTitleLines = pdf.splitTextToSize("Note:", boxWidth - 2 * boxPadding);
        const noteContentLines = pdf.splitTextToSize(quotationContent.quotationNotes, boxWidth - 2 * boxPadding);
        const customerScopeTitleLines = pdf.splitTextToSize("CUSTOMER'S SCOPE:", boxWidth - 2 * boxPadding);
        const customerScopeContentLines = quotationContent.customerScope.split('\n').filter(line => line.trim() !== '');
        let requiredBoxHeight = (noteTitleLines.length * pdfStyles.spacing.lineHeight) + (noteContentLines.length * pdfStyles.spacing.lineHeight) +
            (customerScopeTitleLines.length * pdfStyles.spacing.lineHeight) + (customerScopeContentLines.length * pdfStyles.spacing.lineHeight * 1.2) +
            (boxPadding * 4) + 20;

        if (y + requiredBoxHeight > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
        }
        const boxY = y;
        pdf.rect(boxStartX, boxY, boxWidth, requiredBoxHeight);
        let currentBoxY = boxY + boxPadding;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text(noteTitleLines, boxStartX + boxPadding, currentBoxY);
        currentBoxY += (noteTitleLines.length * pdfStyles.spacing.lineHeight);
        pdf.setDrawColor("#000");
        pdf.setLineWidth(pdfStyles.lines.box);
        pdf.line(boxStartX + boxPadding, currentBoxY, boxStartX + boxWidth - boxPadding, currentBoxY);
        currentBoxY += boxPadding;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text(noteContentLines, boxStartX + boxPadding, currentBoxY, { maxWidth: boxWidth - 2 * boxPadding });
        currentBoxY += (noteContentLines.length * pdfStyles.spacing.lineHeight) + boxPadding * 2;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        pdf.text(customerScopeTitleLines, boxStartX + boxPadding, currentBoxY);
        currentBoxY += (customerScopeTitleLines.length * pdfStyles.spacing.lineHeight);
        pdf.setDrawColor("#000");
        pdf.setLineWidth(pdfStyles.lines.box);
        pdf.line(boxStartX + boxPadding, currentBoxY, boxStartX + boxWidth - boxPadding, currentBoxY);
        currentBoxY += boxPadding;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        for (const line of customerScopeContentLines) {
            const wrappedLines = pdf.splitTextToSize(`• ${line.trim()}`, boxWidth - 2 * boxPadding - 5);
            for (const wrappedLine of wrappedLines) {
                pdf.text(wrappedLine, boxStartX + boxPadding, currentBoxY);
                currentBoxY += pdfStyles.spacing.lineHeight * 1.2;
            }
        }
        y = boxY + requiredBoxHeight + pdfStyles.spacing.sectionGap;

        // Terms & Conditions
        pdf.setFontSize(pdfStyles.fontSize.sectionTitle);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        if (y + pdfStyles.spacing.lineHeight * 4 + (quotationContent.termsData.length * headerRowHeight) > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
        }
        pdf.text("ANNEXURE - II - TERMS & CONDITIONS", pdfWidth / 2, y, { align: "center" });
        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFontSize(pdfStyles.fontSize.summaryText);
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        const termsCol1Width = (pdfWidth - 2 * pdfStyles.spacing.padding) * 0.35;
        const termsCol2Width = (pdfWidth - 2 * pdfStyles.spacing.padding) * 0.65;
        const termRowMinHeight = 7;
        for (const term of quotationContent.termsData) {
            const labelLines = pdf.splitTextToSize(`${term.label}:`, termsCol1Width - 2 * pdfStyles.spacing.cellPadding);
            const valueLines = pdf.splitTextToSize(term.value || 'N/A', termsCol2Width - 2 * pdfStyles.spacing.cellPadding);
            const actualTermRowHeight = Math.max(
                termRowMinHeight,
                (labelLines.length * pdfStyles.spacing.lineHeight) + 2 * pdfStyles.spacing.cellPadding,
                (valueLines.length * pdfStyles.spacing.lineHeight) + 2 * pdfStyles.spacing.cellPadding
            );

            if (y + actualTermRowHeight > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
                pageCount = pdf.internal.getNumberOfPages();
                pdf.addPage();
                y = pdfStyles.spacing.padding;
                await addHeader();
                y += pdfStyles.spacing.lineHeight * 2;
                pdf.setFontSize(pdfStyles.fontSize.sectionTitle);
                pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
                pdf.text("ANNEXURE - II - TERMS & CONDITIONS - Continued", pdfWidth / 2, y, { align: "center" });
                y += pdfStyles.spacing.lineHeight * 2;
                pdf.setFontSize(pdfStyles.fontSize.summaryText);
                pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
            }
            pdf.setDrawColor(pdfStyles.colors.tableBorder);
            pdf.setLineWidth(pdfStyles.lines.table);
            pdf.rect(pdfStyles.spacing.padding, y, termsCol1Width, actualTermRowHeight);
            pdf.rect(pdfStyles.spacing.padding + termsCol1Width, y, termsCol2Width, actualTermRowHeight);
            const labelTextYOffset = (actualTermRowHeight - (labelLines.length * pdfStyles.spacing.lineHeight)) / 2 + pdfStyles.spacing.cellPadding;
            const valueTextYOffset = (actualTermRowHeight - (valueLines.length * pdfStyles.spacing.lineHeight)) / 2 + pdfStyles.spacing.cellPadding;
            pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
            pdf.text(labelLines, pdfStyles.spacing.padding + pdfStyles.spacing.cellPadding, y + labelTextYOffset);
            pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
            pdf.text(valueLines, pdfStyles.spacing.padding + termsCol1Width + pdfStyles.spacing.cellPadding, y + valueTextYOffset);
            y += actualTermRowHeight;
        }

        y += pdfStyles.spacing.lineHeight * 2;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.bold);
        if (y + pdfStyles.spacing.lineHeight * 5 > pdfHeight - pdfStyles.spacing.footerHeight - pdfStyles.spacing.padding) {
            pageCount = pdf.internal.getNumberOfPages();
            pdf.addPage();
            y = pdfStyles.spacing.padding;
            await addHeader();
            y += pdfStyles.spacing.lineHeight * 2;
        }
        pdf.text("For VR INDUSTRIAL SOLUTIONS & MACHINERY", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight * 3;
        pdf.text("V. Sivaraman", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.setFont(pdfStyles.font.family, pdfStyles.font.normal);
        pdf.text("Proprietor", pdfStyles.spacing.padding, y);
        y += pdfStyles.spacing.lineHeight;
        pdf.text("+91 95004 76026", pdfStyles.spacing.padding, y);

        const finalPageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= finalPageCount; i++) {
            pdf.setPage(i);
            addFooter(i, finalPageCount);
        }

        pdf.save(`${quotationContent.quotationNumber || "quotation"}_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err) {
        console.error("Failed to generate PDF:", err);
        toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    }
};