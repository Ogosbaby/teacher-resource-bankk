import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Certificate PDF.
 *
 * Black / white / grey to match the app. The logomark is drawn with plain Views
 * (an open book: two panels and a spine) rather than SVG, because react-pdf's
 * SVG primitives vary across versions and border boxes are guaranteed to render.
 *
 * The AI disclosure is a required element, not decoration — every certificate
 * states that the content behind it was AI-assisted and human-reviewed.
 */

const COMPANY = "Teacher Resource Bank";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  frame: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    padding: 28,
  },
  inner: {
    flex: 1,
    borderWidth: 3,
    borderColor: "#0a0a0a",
    padding: 34,
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mark: {
    flexDirection: "row",
    width: 30,
    height: 26,
  },
  markPanel: {
    flex: 1,
    borderWidth: 1.6,
    borderColor: "#0a0a0a",
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  markPanelRight: {
    flex: 1,
    borderWidth: 1.6,
    borderColor: "#0a0a0a",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  brandName: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#0a0a0a",
  },
  eyebrow: {
    marginTop: 22,
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#737373",
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    letterSpacing: 1,
    color: "#0a0a0a",
  },
  rule: {
    marginTop: 14,
    width: 90,
    borderBottomWidth: 2,
    borderBottomColor: "#a3a3a3",
  },
  presentedTo: {
    marginTop: 20,
    fontSize: 10,
    color: "#737373",
  },
  recipient: {
    marginTop: 10,
    fontSize: 26,
    color: "#0a0a0a",
    textAlign: "center",
  },
  recipientRule: {
    marginTop: 12,
    width: "70%",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
  },
  courseLabel: {
    marginTop: 22,
    fontSize: 10,
    color: "#737373",
  },
  courseTitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#171717",
    textAlign: "center",
    maxWidth: "85%",
  },
  footer: {
    width: "100%",
    marginTop: 26,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    alignItems: "center",
  },
  certifiedBy: {
    fontSize: 10,
    color: "#0a0a0a",
  },
  issuedOn: {
    marginTop: 4,
    fontSize: 9,
    color: "#737373",
  },
  disclosure: {
    marginTop: 12,
    fontSize: 7.5,
    lineHeight: 1.5,
    color: "#737373",
    textAlign: "center",
    maxWidth: "88%",
  },
  reference: {
    marginTop: 8,
    fontSize: 7,
    color: "#a3a3a3",
  },
});

export interface CertificateData {
  recipientName: string;
  courseTitle: string;
  completionDate: string;
  /** e.g. "Certificate of Completion" or "Learning Path Certificate" */
  title?: string;
  referenceId: string;
}

function Logomark() {
  return (
    <View style={styles.mark}>
      <View style={styles.markPanel} />
      <View style={styles.markPanelRight} />
    </View>
  );
}

export function CertificateDocument({ data }: { data: CertificateData }) {
  const title = data.title ?? "Certificate of Completion";

  return (
    <Document
      title={`${title} — ${data.recipientName}`}
      author={COMPANY}
      subject={data.courseTitle}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.inner}>
            <View style={styles.brandRow}>
              <Logomark />
              <Text style={styles.brandName}>{COMPANY}</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={styles.eyebrow}>{title}</Text>
              <Text style={styles.title}>Achievement</Text>
              <View style={styles.rule} />
            </View>

            <View style={{ alignItems: "center", width: "100%" }}>
              <Text style={styles.presentedTo}>This is presented to</Text>
              <Text style={styles.recipient}>{data.recipientName}</Text>
              <View style={styles.recipientRule} />
              <Text style={styles.courseLabel}>for successfully completing</Text>
              <Text style={styles.courseTitle}>{data.courseTitle}</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.certifiedBy}>Certified by {COMPANY}</Text>
              <Text style={styles.issuedOn}>Completed on {data.completionDate}</Text>
              <Text style={styles.disclosure}>
                This course content is AI-assisted and was reviewed by {COMPANY} before
                publication. The certificate confirms completion of the reviewed material.
              </Text>
              <Text style={styles.reference}>Reference {data.referenceId}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
