<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd">
	<xsl:output method="xml" indent="yes" encoding="utf-8"/>
	<xsl:template match="*/IDOC">
		<xsl:variable name="invoice" select="format-number(E1EDK01/BELNR,'0')"/>
		<xsl:variable name="currency" select="E1EDK01/CURCY"/>
		<Invoice>
			<cbc:UBLVersionID>2.1</cbc:UBLVersionID>
			<cbc:ID>
				<xsl:value-of select="format-number(E1EDK01/BELNR,'0')"/>
			</cbc:ID>
			<cbc:UUID>
				<xsl:value-of select="format-number(EDI_DC40/DOCNUM,'0')"/>
			</cbc:UUID>
			<cbc:IssueDate>
				<xsl:call-template name="FormatDate">
					<xsl:with-param name="Date" select="//E1EDK03[IDDAT='026']/DATUM"/>
				</xsl:call-template>
			</cbc:IssueDate>
			<cbc:IssueTime>
				<xsl:call-template name="FormatTime">
					<xsl:with-param name="Time" select="'000000'"/>
				</xsl:call-template>
			</cbc:IssueTime>
			<xsl:variable name="factored">
				<xsl:if test="//E1EDKT1[TDID='ZSOR']/TDOBNAME">
					<xsl:value-of select="'true'"/>
				</xsl:if>
			</xsl:variable>
			<xsl:variable name="inex_terminal">
				<xsl:if test="//E1EDKA1[PARVW='ZR'] and //RCVPRN = 'ZI_INEX'">
					<xsl:value-of select="'true'"/>
				</xsl:if>
			</xsl:variable>
			<cbc:InvoiceTypeCode>
				<xsl:choose>
					<xsl:when test="$factored = 'true' and E1EDK01/BSART ='INVO'">393</xsl:when>
					<xsl:when test="$factored = 'true' and E1EDK01/BSART ='CRME'">396</xsl:when>
					<xsl:when test="$inex_terminal = 'true' and E1EDK01/BSART ='INVO'">390</xsl:when>
					<xsl:when test="$inex_terminal = 'true' and E1EDK01/BSART ='CRME'">308</xsl:when>
					<xsl:when test="E1EDK01/BSART ='INVO'">380</xsl:when>
					<xsl:when test="E1EDK01/BSART ='CRME'">381</xsl:when>
				</xsl:choose>
			</cbc:InvoiceTypeCode>
			<cbc:DocumentCurrencyCode>
				<xsl:value-of select="$currency"/>
			</cbc:DocumentCurrencyCode>
			<cac:OrderReference>
				<cbc:ID>
					<xsl:value-of select="E1EDK02[QUALF='001']/BELNR"/>
				</cbc:ID>
				<cbc:SalesOrderID>
					<xsl:value-of select="format-number(E1EDK02[QUALF='002']/BELNR,'0')"/>
				</cbc:SalesOrderID>
				<cbc:IssueDate>
					<xsl:call-template name="FormatDate">
						<xsl:with-param name="Date" select="E1EDK02[QUALF='002']/DATUM"/>
					</xsl:call-template>
				</cbc:IssueDate>
			</cac:OrderReference>
			<cac:DespatchDocumentReference>
				<cbc:ID>
					<xsl:value-of select="format-number(E1EDK02[QUALF='012']/BELNR,'0')"/>
				</cbc:ID>
			</cac:DespatchDocumentReference>
			<xsl:if test="E1EDK02[QUALF='020']/BELNR != ''">
				<cac:StatementDocumentReference>
					<cbc:ID>
						<xsl:value-of select="format-number(E1EDK02[QUALF='020']/BELNR,'0')"/>
					</cbc:ID>
				</cac:StatementDocumentReference>
			</xsl:if>
			<xsl:if test="//E1EDP02[QUALF='044']/BELNR != ''">
				<cac:OriginatorDocumentReference>
					<cbc:ID>
						<xsl:value-of select="//E1EDP02[QUALF='044']/BELNR"/>
					</cbc:ID>
				</cac:OriginatorDocumentReference>
			</xsl:if>
			<xsl:for-each select="E1EDKA1[PARVW='RS']">
				<cac:AccountingSupplierParty>
					<cac:Party>
						<xsl:call-template name="party">
							<xsl:with-param name="id" select="PARTN"/>
							<xsl:with-param name="legal" select="//E1EDK01/EIGENUINR"/>
							<xsl:with-param name="endpoint" select="../EDI_DC40/SNDLAD"/>
						</xsl:call-template>
					</cac:Party>
				</cac:AccountingSupplierParty>
			</xsl:for-each>
			<xsl:for-each select="E1EDKA1[PARVW='RE']">
				<cac:AccountingCustomerParty>
					<cac:Party>
						<xsl:call-template name="party">
							<xsl:with-param name="id" select="PARTN"/>
							<xsl:with-param name="legal" select="//E1EDK01/KUNDEUINR"/>
							<xsl:with-param name="endpoint" select="../EDI_DC40/RCVLAD"/>
						</xsl:call-template>
					</cac:Party>
				</cac:AccountingCustomerParty>
			</xsl:for-each>
			<xsl:for-each select="E1EDKA1[PARVW='AG']">
				<cac:BuyerCustomerParty>
					<cac:Party>
						<xsl:call-template name="party">
							<xsl:with-param name="id" select="PARTN"/>
							<xsl:with-param name="legal" select="//E1EDK01/KUNDEUINR"/>
							<xsl:with-param name="endpoint" select="../EDI_DC40/RCVLAD"/>
						</xsl:call-template>
					</cac:Party>
				</cac:BuyerCustomerParty>
			</xsl:for-each>
			<cac:Delivery>
				<cbc:ActualDeliveryDate>
					<xsl:choose>
						<xsl:when test="E1EDK03[IDDAT='001']/DATUM != ''">
							<xsl:call-template name="FormatDate">
								<xsl:with-param name="Date" select="E1EDK03[IDDAT='001']/DATUM"/>
							</xsl:call-template>
						</xsl:when>
						<xsl:otherwise>
							<xsl:call-template name="FormatDate">
								<xsl:with-param name="Date" select="E1EDK03[IDDAT='026']/DATUM"/>
							</xsl:call-template>
						</xsl:otherwise>
					</xsl:choose>
				</cbc:ActualDeliveryDate>
				<xsl:for-each select="//E1EDPA1[PARVW='WE']">
					<xsl:if test="position()=1">
						<cac:DeliveryParty>
							<xsl:call-template name="party">
								<xsl:with-param name="id" select="PARTN"/>
								<xsl:with-param name="legal" select="''"/>
								<xsl:with-param name="endpoint" select="''"/>
							</xsl:call-template>
						</cac:DeliveryParty>
					</xsl:if>
				</xsl:for-each>
				<xsl:for-each select="E1EDKA1[PARVW='ZR']">
					<cac:NotifyParty>
						<xsl:call-template name="party">
							<xsl:with-param name="id" select="TELBX"/>
							<xsl:with-param name="legal" select="''"/>
							<xsl:with-param name="endpoint" select="''"/>
						</xsl:call-template>
					</cac:NotifyParty>
				</xsl:for-each>
			</cac:Delivery>
			<cac:PaymentMeans>
				<cbc:PaymentMeansCode/>
				<cbc:PaymentDueDate>
					<xsl:call-template name="FormatDate">
						<xsl:with-param name="Date" select="E1EDK03[IDDAT='028']/DATUM"/>
					</xsl:call-template>
				</cbc:PaymentDueDate>
				<cbc:InstructionID>
					<xsl:value-of select="E1EDK02[QUALF='022']/BELNR"/>
				</cbc:InstructionID>
				<cbc:PaymentID>
					<xsl:value-of select="E1EDK02[QUALF='022']/BELNR"/>
				</cbc:PaymentID>
			</cac:PaymentMeans>
			<cac:TaxTotal>
				<cbc:TaxAmount currencyID="{$currency}">
					<xsl:value-of select="format-number(E1EDS01[SUMID='005']/SUMME,'0.00')"/>
				</cbc:TaxAmount>
				<xsl:for-each select="E1EDS01[SUMID='010']/Z1EDS04">
					<cac:TaxSubtotal>
						<cbc:TaxableAmount currencyID="{$currency}">
							<xsl:value-of select="format-number(BETRG,'0.00')"/>
						</cbc:TaxableAmount>
						<cbc:TaxAmount currencyID="{$currency}">
							<xsl:value-of select="format-number(BETRG * MSATZ div 100 ,'0.00')"/>
						</cbc:TaxAmount>
						<cac:TaxCategory>
							<cbc:ID>S</cbc:ID>
							<cbc:Percent>
								<xsl:value-of select="format-number(MSATZ,'0.00')"/>
							</cbc:Percent>
							<cac:TaxScheme>
								<cbc:ID>VAT</cbc:ID>
							</cac:TaxScheme>
						</cac:TaxCategory>
					</cac:TaxSubtotal>
				</xsl:for-each>
				<xsl:if test="not(//Z1EDS04[MWSKZ='V0'])">
					<xsl:variable name="noTaxable">
						<xsl:value-of select="sum(//E1EDP05[KSCHL='ZDEP']/BETRG)"/>
					</xsl:variable>
					<xsl:if test="$noTaxable &gt; 0">
						<cac:TaxSubtotal>
							<cbc:TaxableAmount currencyID="{$currency}">
								<xsl:value-of select="format-number($noTaxable,'0.00')"/>
							</cbc:TaxableAmount>
							<cbc:TaxAmount currencyID="{$currency}">0.00</cbc:TaxAmount>
							<cac:TaxCategory>
								<cbc:ID>S</cbc:ID>
								<cbc:Percent>0.00</cbc:Percent>
								<cac:TaxScheme>
									<cbc:ID>VAT</cbc:ID>
								</cac:TaxScheme>
							</cac:TaxCategory>
						</cac:TaxSubtotal>
					</xsl:if>
				</xsl:if>
			</cac:TaxTotal>
			<cac:LegalMonetaryTotal>
				<cbc:LineExtensionAmount currencyID="{$currency}">
					<xsl:value-of select="E1EDS01[SUMID='010']/SUMME"/>
				</cbc:LineExtensionAmount>
				<cbc:TaxExclusiveAmount currencyID="{$currency}">
					<xsl:value-of select="E1EDS01[SUMID='010']/SUMME"/>
				</cbc:TaxExclusiveAmount>
				<cbc:TaxInclusiveAmount currencyID="{$currency}">
					<xsl:value-of select="E1EDS01[SUMID='011']/SUMME"/>
				</cbc:TaxInclusiveAmount>
				<cbc:PayableAmount currencyID="{$currency}">
					<xsl:value-of select="E1EDS01[SUMID='011']/SUMME"/>
				</cbc:PayableAmount>
			</cac:LegalMonetaryTotal>
			<xsl:variable name="posex_spacing" select="number(//E1EDP01[2]/POSEX) - number(//E1EDP01[1]/POSEX)"/>
			<xsl:for-each select="E1EDP01">
				<xsl:variable name="net_value">
					<xsl:choose>
						<!-- If deposit handling is active, use subtotal 013 if set else 012 as net value of item -->
						<xsl:when test="//MESCOD = 'DEP'">
							<xsl:choose>
								<xsl:when test="E1EDP26[QUALF='013']/BETRG">
									<xsl:value-of select="E1EDP26[QUALF='013']/BETRG"/>
								</xsl:when>
								<xsl:when test="E1EDP26[QUALF='012']/BETRG">
									<xsl:value-of select="E1EDP26[QUALF='012']/BETRG"/>
								</xsl:when>
								<xsl:otherwise>0.00</xsl:otherwise>
							</xsl:choose>
						</xsl:when>
						<xsl:when test="E1EDP26[QUALF='003']/BETRG">
							<xsl:value-of select="E1EDP26[QUALF='003']/BETRG"/>
						</xsl:when>
						<xsl:otherwise>0.00</xsl:otherwise>
					</xsl:choose>
				</xsl:variable>
				<cac:InvoiceLine>
					<cbc:ID>
						<xsl:choose>
							<xsl:when test="$posex_spacing &lt;= 2">
								<xsl:value-of select="position()"/>
							</xsl:when>
							<xsl:otherwise>
								<xsl:value-of select="format-number(POSEX,'0')"/>
							</xsl:otherwise>
						</xsl:choose>
					</cbc:ID>
					<cbc:InvoicedQuantity>
						<xsl:attribute name="unitCode">
							<xsl:value-of select="MENEE"/>
						</xsl:attribute>
						<xsl:value-of select="format-number(MENGE,'0.###')"/>
					</cbc:InvoicedQuantity>
					<cbc:LineExtensionAmount currencyID="{$currency}">
						<xsl:value-of select="$net_value"/>
					</cbc:LineExtensionAmount>
					<cac:OrderLineReference>
						<cbc:LineID>
							<xsl:call-template name="trim">
								<xsl:with-param name="value" select="E1EDP02[QUALF='001']/ZEILE"/>
							</xsl:call-template>
						</cbc:LineID>
						<cbc:SalesOrderLineID>
							<xsl:call-template name="trim">
								<xsl:with-param name="value" select="E1EDP02[QUALF='002']/ZEILE"/>
							</xsl:call-template>
						</cbc:SalesOrderLineID>
						<cac:OrderReference>
							<cbc:ID>
								<xsl:choose>
									<xsl:when test="E1EDP02[QUALF='001']/BELNR != ''">
										<xsl:value-of select="E1EDP02[QUALF='001']/BELNR"/>
									</xsl:when>
									<xsl:when test="//E1EDP02[QUALF='001']/BELNR != ''">
										<xsl:value-of select="//E1EDP02[QUALF='001']/BELNR"/>
									</xsl:when>
								</xsl:choose>
							</cbc:ID>
							<cbc:SalesOrderID>
								<xsl:call-template name="trim">
									<xsl:with-param name="value" select="E1EDP02[QUALF='002']/BELNR"/>
								</xsl:call-template>
							</cbc:SalesOrderID>
							<xsl:if test="E1EDP02[QUALF='002']/DATUM != ''">
								<cbc:IssueDate>
									<xsl:call-template name="FormatDate">
										<xsl:with-param name="Date" select="E1EDP02[QUALF='002']/DATUM"/>
									</xsl:call-template>
								</cbc:IssueDate>
							</xsl:if>
						</cac:OrderReference>
					</cac:OrderLineReference>
					<xsl:if test="E1EDP02[QUALF='016']/BELNR != ''">
						<cac:DespatchLineReference>
							<cbc:LineID>
								<xsl:value-of select="format-number(E1EDP02[QUALF='016']/ZEILE,'0')"/>
							</cbc:LineID>
							<cac:DocumentReference>
								<cbc:ID>
									<xsl:value-of select="format-number(E1EDP02[QUALF='016']/BELNR,'0')"/>
								</cbc:ID>
								<cbc:IssueDate>
									<xsl:call-template name="FormatDate">
										<xsl:with-param name="Date" select="E1EDP02[QUALF='016']/DATUM"/>
									</xsl:call-template>
								</cbc:IssueDate>
							</cac:DocumentReference>
						</cac:DespatchLineReference>
					</xsl:if>
					<xsl:if test="E1EDP02[QUALF='044']/BELNR != ''">
						<cac:DocumentReference>
							<cbc:ID>
								<xsl:value-of select="E1EDP02[QUALF='044']/ZEILE"/>
							</cbc:ID>
							<cbc:DocumentType>Originator</cbc:DocumentType>
							<cbc:DocumentDescription>
								<xsl:value-of select="E1EDP02[QUALF='044']/BELNR"/>
							</cbc:DocumentDescription>
						</cac:DocumentReference>
					</xsl:if>
					<cac:TaxTotal>
						<cbc:TaxAmount currencyID="{$currency}">
							<xsl:choose>
								<xsl:when test="E1EDP04[MWSKZ='V2']/MWSBT">
									<xsl:value-of select="format-number(E1EDP04[MWSKZ='V2']/MWSBT,'0.00')"/>
								</xsl:when>
								<xsl:when test="E1EDP04[MWSKZ='V1']/MWSBT">
									<xsl:value-of select="format-number(E1EDP04[MWSKZ='V1']/MWSBT,'0.00')"/>
								</xsl:when>
								<xsl:when test="E1EDP04[MWSKZ='V8']/MWSBT">
									<xsl:value-of select="format-number(E1EDP04[MWSKZ='V8']/MWSBT,'0.00')"/>
								</xsl:when>
								<xsl:otherwise>0.00</xsl:otherwise>
							</xsl:choose>
						</cbc:TaxAmount>
						<cac:TaxSubtotal>
							<cbc:TaxAmount currencyID="{$currency}">
								<xsl:choose>
									<xsl:when test="E1EDP04[MWSKZ='V2']/MWSBT">
										<xsl:value-of select="format-number(E1EDP04[MWSKZ='V2']/MWSBT,'0.00')"/>
									</xsl:when>
									<xsl:when test="E1EDP04[MWSKZ='V1']/MWSBT">
										<xsl:value-of select="format-number(E1EDP04[MWSKZ='V1']/MWSBT,'0.00')"/>
									</xsl:when>
									<xsl:when test="E1EDP04[MWSKZ='V8']/MWSBT">
										<xsl:value-of select="format-number(E1EDP04[MWSKZ='V8']/MWSBT,'0.00')"/>
									</xsl:when>
									<xsl:otherwise>0.00</xsl:otherwise>
								</xsl:choose>
							</cbc:TaxAmount>
							<cbc:PerUnitAmount currencyID="{$currency}">
								<xsl:choose>
									<xsl:when test="MENGE = '0'">0.00</xsl:when>
									<xsl:when test="E1EDP04[MWSKZ='V2']/MWSBT">
										<xsl:value-of select="format-number((E1EDP04[MWSKZ='V2']/MWSBT div MENGE),'0.000')"/>
									</xsl:when>
									<xsl:when test="E1EDP04[MWSKZ='V1']/MWSBT">
										<xsl:value-of select="format-number((E1EDP04[MWSKZ='V1']/MWSBT div MENGE),'0.000')"/>
									</xsl:when>
									<xsl:when test="E1EDP04[MWSKZ='V8']/MWSBT">
										<xsl:value-of select="format-number((E1EDP04[MWSKZ='V8']/MWSBT div MENGE),'0.000')"/>
									</xsl:when>
									<xsl:otherwise>0.00</xsl:otherwise>
								</xsl:choose>
							</cbc:PerUnitAmount>
							<cac:TaxCategory>
								<cbc:ID>S</cbc:ID>
								<cbc:Percent>
									<xsl:choose>
										<xsl:when test="E1EDP04[MWSKZ='V2']/MSATZ">
											<xsl:value-of select="E1EDP04[MWSKZ='V2']/MSATZ"/>
										</xsl:when>
										<xsl:when test="E1EDP04[MWSKZ='V1']/MSATZ">
											<xsl:value-of select="E1EDP04[MWSKZ='V1']/MSATZ"/>
										</xsl:when>
										<xsl:when test="E1EDP04[MWSKZ='V8']/MSATZ">
											<xsl:value-of select="E1EDP04[MWSKZ='V8']/MSATZ"/>
										</xsl:when>
										<xsl:otherwise>0.000</xsl:otherwise>
									</xsl:choose>
								</cbc:Percent>
								<cac:TaxScheme>
									<cbc:ID>VAT</cbc:ID>
								</cac:TaxScheme>
							</cac:TaxCategory>
						</cac:TaxSubtotal>
					</cac:TaxTotal>
					<cac:Item>
						<cbc:Name>
							<xsl:value-of select="E1EDP19[QUALF='002']/KTEXT"/>
						</cbc:Name>
						<cac:BuyersItemIdentification>
							<cbc:ID>
								<xsl:value-of select="E1EDP19[QUALF='001']/IDTNR"/>
							</cbc:ID>
						</cac:BuyersItemIdentification>
						<cac:SellersItemIdentification>
							<cbc:ID>
								<xsl:choose>
									<xsl:when test="number(E1EDP19[QUALF='002']/IDTNR) = number(E1EDP19[QUALF='002']/IDTNR)">
										<xsl:value-of select="format-number(E1EDP19[QUALF='002']/IDTNR,'0')"/>
									</xsl:when>
									<xsl:otherwise>
										<xsl:value-of select="E1EDP19[QUALF='002']/IDTNR"/>
									</xsl:otherwise>
								</xsl:choose>
							</cbc:ID>
						</cac:SellersItemIdentification>
						<cac:StandardItemIdentification>
							<cbc:ID>
								<xsl:choose>
									<xsl:when test="E1EDP19[QUALF='001']/IDTNR_VERSION = 'X'">
										<xsl:value-of select="E1EDP19[QUALF='001']/IDTNR"/>
									</xsl:when>
									<xsl:otherwise>
										<xsl:value-of select="E1EDP19[QUALF='003']/IDTNR"/>
									</xsl:otherwise>
								</xsl:choose>
							</cbc:ID>
						</cac:StandardItemIdentification>
						<xsl:for-each select="E1EDP19[QUALF='ZCG']">
							<cac:CatalogueItemIdentification>
								<cbc:ID>
									<xsl:choose>
										<xsl:when test="substring(IDTNR,1,1)='F'">
											<xsl:value-of select="concat('1',substring(IDTNR,2))"/>
										</xsl:when>
										<xsl:otherwise>
											<xsl:value-of select="IDTNR"/>
										</xsl:otherwise>
									</xsl:choose>
								</cbc:ID>
							</cac:CatalogueItemIdentification>
						</xsl:for-each>
						<cac:ItemInstance>
							<cac:LotIdentification>
								<cbc:LotNumberID>
									<xsl:value-of select="E1EDPT1[TDID='Z091']/E1EDPT2/TDLINE"/>
								</cbc:LotNumberID>
							</cac:LotIdentification>
						</cac:ItemInstance>
					</cac:Item>
					<cac:Price>
						<cbc:PriceAmount currencyID="{$currency}">
							<xsl:choose>
								<xsl:when test="PSTYV = 'DEP'">
									<!-- Deposit price is already pre-calculated to QUALF 001 -->
									<xsl:value-of select="format-number(E1EDP26[QUALF='001']/BETRG,'0.00##')"/>
								</xsl:when>
								<xsl:when test="MENGE = '0'">0.00</xsl:when>
								<xsl:otherwise>
									<xsl:value-of select="format-number(($net_value div MENGE),'0.00')"/>
								</xsl:otherwise>
							</xsl:choose>
						</cbc:PriceAmount>
					</cac:Price>
				</cac:InvoiceLine>
				<xsl:if test="//MESCOD = 'DEP'">
					<!-- Extra LIN item for the bottle deposit if found -->
					<xsl:for-each select="E1EDP05[KSCHL = 'ZDEP']">
						<cac:InvoiceLine>
							<cbc:ID>
								<xsl:choose>
									<xsl:when test="$posex_spacing &lt;= 2">
										<xsl:value-of select="count(../preceding-sibling::E1EDP01) + 1 + position()"/>
									</xsl:when>
									<xsl:otherwise>
										<xsl:value-of select="format-number(../POSEX + 1,'0')"/>
									</xsl:otherwise>
								</xsl:choose>
							</cbc:ID>
							<cbc:InvoicedQuantity>
								<xsl:attribute name="unitCode">
									<xsl:value-of select="../MENEE"/>
								</xsl:attribute>
								<xsl:value-of select="format-number(../MENGE,'0.###')"/>
							</cbc:InvoicedQuantity>
							<cbc:LineExtensionAmount currencyID="{$currency}">
								<xsl:value-of select="BETRG"/>
							</cbc:LineExtensionAmount>
							<cac:OrderLineReference>
								<cbc:LineID>
									<xsl:call-template name="trim">
										<xsl:with-param name="value" select="../E1EDP02[QUALF='001']/ZEILE"/>
									</xsl:call-template>
								</cbc:LineID>
								<cbc:SalesOrderLineID>
									<xsl:call-template name="trim">
										<xsl:with-param name="value" select="../E1EDP02[QUALF='002']/ZEILE"/>
									</xsl:call-template>
								</cbc:SalesOrderLineID>
								<cac:OrderReference>
									<cbc:ID>
										<xsl:choose>
											<xsl:when test="../E1EDP02[QUALF='001']/BELNR != ''">
												<xsl:value-of select="../E1EDP02[QUALF='001']/BELNR"/>
											</xsl:when>
											<xsl:when test="//E1EDP02[QUALF='001']/BELNR != ''">
												<xsl:value-of select="//E1EDP02[QUALF='001']/BELNR"/>
											</xsl:when>
										</xsl:choose>
									</cbc:ID>
									<cbc:SalesOrderID>
										<xsl:call-template name="trim">
											<xsl:with-param name="value" select="../E1EDP02[QUALF='002']/BELNR"/>
										</xsl:call-template>
									</cbc:SalesOrderID>
									<xsl:if test="../E1EDP02[QUALF='002']/DATUM != ''">
										<cbc:IssueDate>
											<xsl:call-template name="FormatDate">
												<xsl:with-param name="Date" select="../E1EDP02[QUALF='002']/DATUM"/>
											</xsl:call-template>
										</cbc:IssueDate>
									</xsl:if>
								</cac:OrderReference>
							</cac:OrderLineReference>
							<xsl:if test="../E1EDP02[QUALF='016']/BELNR != ''">
								<cac:DespatchLineReference>
									<cbc:LineID>
										<xsl:value-of select="format-number(../E1EDP02[QUALF='016']/ZEILE,'0')"/>
									</cbc:LineID>
									<cac:DocumentReference>
										<cbc:ID>
											<xsl:value-of select="format-number(../E1EDP02[QUALF='016']/BELNR,'0')"/>
										</cbc:ID>
										<cbc:IssueDate>
											<xsl:call-template name="FormatDate">
												<xsl:with-param name="Date" select="../E1EDP02[QUALF='016']/DATUM"/>
											</xsl:call-template>
										</cbc:IssueDate>
									</cac:DocumentReference>
								</cac:DespatchLineReference>
							</xsl:if>
							<xsl:if test="../E1EDP02[QUALF='044']/BELNR != ''">
								<cac:DocumentReference>
									<cbc:ID>
										<xsl:value-of select="../E1EDP02[QUALF='044']/ZEILE"/>
									</cbc:ID>
									<cbc:DocumentType>Originator</cbc:DocumentType>
									<cbc:DocumentDescription>
										<xsl:value-of select="../E1EDP02[QUALF='044']/BELNR"/>
									</cbc:DocumentDescription>
								</cac:DocumentReference>
							</xsl:if>
							<cac:TaxTotal>
								<cbc:TaxAmount currencyID="{$currency}">0.00</cbc:TaxAmount>
								<cac:TaxSubtotal>
									<cbc:TaxAmount currencyID="{$currency}">0.00</cbc:TaxAmount>
									<cbc:PerUnitAmount currencyID="{$currency}">0.00</cbc:PerUnitAmount>
									<cac:TaxCategory>
										<cbc:ID>S</cbc:ID>
										<cbc:Percent>0.00</cbc:Percent>
										<cac:TaxScheme>
											<cbc:ID>VAT</cbc:ID>
										</cac:TaxScheme>
									</cac:TaxCategory>
								</cac:TaxSubtotal>
							</cac:TaxTotal>
							<cac:Item>
								<cbc:Name>PANT</cbc:Name>
								<cac:SellersItemIdentification>
									<cbc:ID>PANT0.10</cbc:ID>
								</cac:SellersItemIdentification>
							</cac:Item>
							<cac:Price>
								<cbc:PriceAmount currencyID="{$currency}">
									<xsl:value-of select="format-number((BETRG div ../MENGE),'0.00')"/>
								</cbc:PriceAmount>
							</cac:Price>
						</cac:InvoiceLine>
					</xsl:for-each>
				</xsl:if>
			</xsl:for-each>
		</Invoice>
	</xsl:template>
	<xsl:template name="FormatDate">
		<xsl:param name="Date"/>
		<xsl:value-of select="substring($Date,1,4)"/>
		<xsl:text>-</xsl:text>
		<xsl:value-of select="substring($Date,5,2)"/>
		<xsl:text>-</xsl:text>
		<xsl:value-of select="substring($Date,7,2)"/>
	</xsl:template>
	<xsl:template name="FormatTime">
		<xsl:param name="Time"/>
		<xsl:value-of select="substring($Time,1,2)"/>
		<xsl:text>:</xsl:text>
		<xsl:value-of select="substring($Time,3,2)"/>
		<xsl:text>:</xsl:text>
		<xsl:value-of select="substring($Time,5,2)"/>
	</xsl:template>
	<xsl:template name="trim">
		<xsl:param name="value"/>
		<xsl:choose>
			<xsl:when test="starts-with($value,'0')">
				<xsl:value-of select="format-number($value,'0')"/>
			</xsl:when>
			<xsl:when test="$value != ''">
				<xsl:value-of select="$value"/>
			</xsl:when>
		</xsl:choose>
	</xsl:template>
	<xsl:template name="party">
		<xsl:param name="id"/>
		<xsl:param name="legal"/>
		<xsl:param name="endpoint"/>
		<xsl:variable name="scheme">
			<xsl:choose>
				<xsl:when test="starts-with($endpoint,'0037')">ISO6523</xsl:when>
				<xsl:when test="starts-with($endpoint,'64')">GLN</xsl:when>
				<xsl:when test="starts-with($endpoint,'73')">GLN</xsl:when>
				<xsl:otherwise>ZZZ</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
		<xsl:if test="$endpoint != ''">
			<cbc:EndpointID>
				<xsl:attribute name="schemeID">
					<xsl:value-of select="$scheme"/>
				</xsl:attribute>
				<xsl:value-of select="$endpoint"/>
			</cbc:EndpointID>
		</xsl:if>
		<cac:PartyIdentification>
			<cbc:ID>
				<xsl:choose>
					<!-- Inex terminal ID handling -->
					<xsl:when test="contains($id,'-')">
						<xsl:value-of select="substring-before($id,'-')"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:value-of select="$id"/>
					</xsl:otherwise>
				</xsl:choose>
			</cbc:ID>
		</cac:PartyIdentification>
		<cac:PartyName>
			<cbc:Name>
				<xsl:value-of select="NAME1"/>
			</cbc:Name>
		</cac:PartyName>
		<cac:PostalAddress>
			<cbc:StreetName>
				<xsl:value-of select="STRAS"/>
			</cbc:StreetName>
			<cbc:CityName>
				<xsl:value-of select="ORT01"/>
			</cbc:CityName>
			<cbc:PostalZone>
				<xsl:value-of select="PSTLZ"/>
			</cbc:PostalZone>
			<cac:Country>
				<cbc:IdentificationCode>
					<xsl:value-of select="LAND1"/>
				</cbc:IdentificationCode>
			</cac:Country>
		</cac:PostalAddress>
		<xsl:if test="$legal != ''">
			<cac:PartyLegalEntity>
				<cbc:CompanyID>
					<xsl:value-of select="$legal"/>
				</cbc:CompanyID>
			</cac:PartyLegalEntity>
		</xsl:if>
	</xsl:template>
</xsl:stylesheet>