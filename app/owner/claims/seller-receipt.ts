import type { Order } from '../../../lib/types';

const peso=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0});

const escapeXml=(value:string) => value
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&apos;');

const shorten=(value:string,limit:number) => value.length>limit?`${value.slice(0,limit-1)}…`:value;

const statusLabels:Record<string,string>={
  pending_payment:'Pending payment',
  paid:'Paid',
  shipped:'Shipped',
  completed:'Completed',
  cancelled:'Cancelled',
};

export async function downloadSellerReceipt(order:Order) {
  const width=1080;
  const rowHeight=76;
  const summaryY=920+order.items.length*rowHeight;
  const height=Math.max(1450,summaryY+330);
  const finalTotal=order.total+order.shipping_fee;
  const orderDate=new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(order.created_at));
  const generatedAt=new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
  const itemRows=order.items.map((item,index)=>{
    const y=900+index*rowHeight;
    return `<g>
      <line x1="110" y1="${y-38}" x2="970" y2="${y-38}" stroke="#DED8CC"/>
      <text x="120" y="${y+12}" fill="#24352D" font-family="Georgia, serif" font-size="25">${escapeXml(shorten(item.title,46))}</text>
      <text x="950" y="${y+12}" fill="#24352D" font-family="Arial, sans-serif" font-size="23" font-weight="700" text-anchor="end">${escapeXml(peso.format(item.price))}</text>
    </g>`;
  }).join('');
  const deliveryLine=[order.delivery_method,order.address].filter(Boolean).join(' · ');
  const receiptSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="1080" height="${height}" fill="#F6F1E7"/>
    <rect x="52" y="52" width="976" height="${height-104}" rx="24" fill="#FCFAF5" stroke="#D7D0C3" stroke-width="2"/>
    <g transform="translate(463 72) scale(2.4)" fill="none">
      <path d="M4 27.5c10.6-2.8 19.7-.9 28 5.7v18.1c-8.4-6.2-17.7-7.7-28-4.7V27.5Zm56 0c-10.6-2.8-19.7-.9-28 5.7v18.1c8.4-6.2 17.7-7.7 28-4.7V27.5Z" stroke="#24352D" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M7.5 32.2c8.7-1.7 16.2.1 22.4 5.2M56.5 32.2c-8.7-1.7-16.2.1-22.4 5.2M32 33.2v18.1M31.9 32.5c-3.7-5-5.4-10.9-4.6-17.2M32.1 32.5c4-4 6.4-8.6 7-13.9" stroke="#24352D" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M27.8 22.2c-4.3-.5-6.7-2.5-7.2-6 4.2.2 6.6 2.2 7.2 6Zm10.4 3c4.1-.8 6.3-3 6.5-6.4-4.1.5-6.3 2.6-6.5 6.4Z" stroke="#24352D" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M27.2 15.8c-3.5-1.9-4.8-4.5-3.7-7.7 3.5 1.7 4.8 4.3 3.7 7.7Zm12.2 3.4c3.6-1.6 5-4.1 4.2-7.4-3.6 1.4-5.1 3.9-4.2 7.4ZM27.4 8.5c-2.7-.9-3.2-3.9-.9-5.3 1.3-.8 3-.2 3.7 1.4.1-1.8 1.5-3 3-2.7 2.6.5 3 3.6.7 5.2 2.7-.2 4.2 2.5 2.6 4.5-1 1.2-2.8 1.2-4 0-.5 1.7-2.1 2.5-3.5 1.8-2.4-1.1-2.2-4.2.4-5.3" stroke="#D87356" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="31.8" cy="7.8" r="1.25" fill="#D87356"/>
    </g>
    <text x="540" y="246" fill="#24352D" font-family="Georgia, serif" font-size="44" font-weight="700" text-anchor="middle">The Second Chapter</text>
    <text x="540" y="292" fill="#6C7771" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="4" text-anchor="middle">SELLER RECEIPT</text>

    <rect x="110" y="335" width="860" height="120" rx="12" fill="#24352D"/>
    <text x="145" y="378" fill="#AEB8B3" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2">CLAIM CODE</text>
    <text x="145" y="425" fill="#F6F1E7" font-family="Georgia, serif" font-size="34" font-weight="700">${escapeXml(order.code)}</text>
    <text x="935" y="378" fill="#AEB8B3" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="end">${escapeXml(orderDate)}</text>
    <text x="935" y="425" fill="#F6F1E7" font-family="Arial, sans-serif" font-size="21" font-weight="700" text-anchor="end">${escapeXml(statusLabels[order.status]??order.status)}</text>

    <text x="110" y="510" fill="#D87356" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="3">BUYER &amp; DELIVERY</text>
    <text x="120" y="560" fill="#24352D" font-family="Georgia, serif" font-size="31" font-weight="700">${escapeXml(shorten(order.customer_name,42))}</text>
    <text x="120" y="606" fill="#5E6B64" font-family="Arial, sans-serif" font-size="20">Phone · ${escapeXml(shorten(order.phone,36))}</text>
    <text x="120" y="648" fill="#5E6B64" font-family="Arial, sans-serif" font-size="20">Facebook · ${escapeXml(shorten(order.facebook_profile,58))}</text>
    <text x="120" y="690" fill="#5E6B64" font-family="Arial, sans-serif" font-size="20">Delivery · ${escapeXml(shorten(deliveryLine||'Not provided',70))}</text>
    <text x="120" y="732" fill="#5E6B64" font-family="Arial, sans-serif" font-size="20">Tracking · ${escapeXml(shorten(order.tracking_number||'Not assigned',60))}</text>
    <text x="120" y="774" fill="#5E6B64" font-family="Arial, sans-serif" font-size="20">Notes · ${escapeXml(shorten(order.notes||'None',72))}</text>

    <text x="110" y="835" fill="#D87356" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="3">BOOKS</text>
    ${itemRows}

    <line x1="110" y1="${summaryY-25}" x2="970" y2="${summaryY-25}" stroke="#CFC8BB" stroke-width="2"/>
    <text x="120" y="${summaryY+28}" fill="#6C7771" font-family="Arial, sans-serif" font-size="18">Book subtotal</text>
    <text x="950" y="${summaryY+28}" fill="#24352D" font-family="Arial, sans-serif" font-size="24" font-weight="700" text-anchor="end">${escapeXml(peso.format(order.total))}</text>
    <text x="120" y="${summaryY+78}" fill="#6C7771" font-family="Arial, sans-serif" font-size="18">Shipping fee</text>
    <text x="950" y="${summaryY+78}" fill="#24352D" font-family="Arial, sans-serif" font-size="24" font-weight="700" text-anchor="end">${escapeXml(peso.format(order.shipping_fee))}</text>
    <rect x="110" y="${summaryY+112}" width="860" height="98" rx="12" fill="#FFF0E8" stroke="#D87356"/>
    <text x="145" y="${summaryY+172}" fill="#A94D35" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2">TOTAL</text>
    <text x="935" y="${summaryY+176}" fill="#24352D" font-family="Georgia, serif" font-size="40" font-weight="700" text-anchor="end">${escapeXml(peso.format(finalTotal))}</text>
    <text x="540" y="${height-92}" fill="#7B8580" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">Generated ${escapeXml(generatedAt)} · Seller copy</text>
  </svg>`;

  const svgUrl=URL.createObjectURL(new Blob([receiptSvg],{type:'image/svg+xml;charset=utf-8'}));
  try {
    const image=new Image();
    image.decoding='async';
    image.src=svgUrl;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Canvas is not available.');
    context.drawImage(image,0,0);
    const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('Could not create receipt image.')),'image/png'));
    const pngUrl=URL.createObjectURL(png);
    const link=document.createElement('a');
    link.href=pngUrl;
    link.download=`the-second-chapter-seller-${order.code.toLowerCase().replaceAll(/[^a-z0-9-]/g,'-')}.png`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(pngUrl),1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
