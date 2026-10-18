package vn.wedding.invitation;

import java.util.*;
import java.awt.image.BufferedImage;
import java.text.Normalizer;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.admin.ExportService;
import static org.junit.jupiter.api.Assertions.*;

class ExportPdfTest {
    @Test void rendersFifteenLabelsPerPageWithVietnameseTextAndQr() throws Exception {
        var rows=new ArrayList<ExportService.PdfRow>();
        for(int i=1;i<=16;i++) rows.add(new ExportService.PdfRow(i,"Gia đình cô Hoa — lời mời số "+i,"https://example.test/i/token-"+i,"Tiệc cưới; Lễ thành hôn"));
        byte[] bytes=ExportService.renderPdf(rows);
        assertTrue(bytes.length>10_000);
        try(PDDocument document=Loader.loadPDF(bytes)){
            assertEquals(2,document.getNumberOfPages());
            String text=Normalizer.normalize(new PDFTextStripper().getText(document),Normalizer.Form.NFC);
            assertTrue(text.contains("Gia đình"));
            assertTrue(text.contains("Hoa"));
            assertTrue(text.contains("Tiệc"));
            assertTrue(text.contains("ệ"));
            assertTrue(decodeQr(document).contains("https://example.test/i/token-1"));
            assertTrue(decodeQr(document).contains("https://example.test/i/token-16"));
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