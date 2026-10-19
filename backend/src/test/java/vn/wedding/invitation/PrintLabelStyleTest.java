package vn.wedding.invitation;

import java.text.Normalizer;
import java.util.*;
import java.awt.image.BufferedImage;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.admin.ExportService;
import static org.junit.jupiter.api.Assertions.*;

/** Print centre (docs/02 §14): the label style changes the sheet only — never the labels per page or the QR payload. */
class PrintLabelStyleTest {
    @Test void defaultsToNameQrAndOnlyAcceptsTheTwoKnownStyles() {
        assertEquals("NAME_QR",ExportService.labelStyle(null));
        assertEquals("NAME_QR",ExportService.labelStyle("  "));
        assertEquals("QR_ONLY",ExportService.labelStyle("QR_ONLY"));
        assertEquals(2,ExportService.LABEL_STYLES.size());
        assertTrue(ExportService.LABEL_STYLES.containsAll(Set.of("QR_ONLY","NAME_QR")));
    }
    @Test void qrOnlySheetKeepsFifteenLabelsPerPageAndHidesTheGuestName() throws Exception {
        var rows=new ArrayList<ExportService.PdfRow>();
        for(int i=1;i<=16;i++) rows.add(new ExportService.PdfRow(i,"Gia đình cô Hoa — lời mời số "+i,"https://example.test/i/token-"+i,"Tiệc cưới"));
        byte[] bytes=ExportService.renderPdf(rows,"QR_ONLY");
        assertTrue(bytes.length>10_000);
        try(PDDocument document=Loader.loadPDF(bytes)){
            assertEquals(2,document.getNumberOfPages());
            String text=Normalizer.normalize(new PDFTextStripper().getText(document),Normalizer.Form.NFC);
            assertFalse(text.contains("Gia đình"),"Mẫu chỉ QR không in tên khách");
            assertTrue(text.contains("Mã"),"Mẫu chỉ QR vẫn in mã số để đối chiếu");
            assertTrue(decodeQr(document).contains("https://example.test/i/token-1"));
            assertTrue(decodeQr(document).contains("https://example.test/i/token-16"));
        }
    }
    @Test void bothStylesPrintTheSameNumberOfPages() throws Exception {
        var rows=new ArrayList<ExportService.PdfRow>();
        for(int i=1;i<=31;i++) rows.add(new ExportService.PdfRow(i,"Khách số "+i,"https://example.test/i/token-"+i,"Tiệc cưới"));
        try(PDDocument named=Loader.loadPDF(ExportService.renderPdf(rows,"NAME_QR"));PDDocument coded=Loader.loadPDF(ExportService.renderPdf(rows,"QR_ONLY"))){
            assertEquals(3,named.getNumberOfPages());
            assertEquals(3,coded.getNumberOfPages());
        }
    }
    private static Set<String> decodeQr(PDDocument document) throws Exception {
        Set<String> values=new HashSet<>();
        for(PDPage page:document.getPages()){
            PDResources resources=page.getResources();
            for(var name:resources.getXObjectNames()){
                PDXObject object=resources.getXObject(name);
                if(object instanceof PDImageXObject image){
                    BufferedImage buffered=image.getImage();
                    try{values.add(new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(buffered)))).getText());}catch(Exception ignored){}
                }
            }
        }
        return values;
    }
}