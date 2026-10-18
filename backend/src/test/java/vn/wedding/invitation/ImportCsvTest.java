package vn.wedding.invitation;

import org.junit.jupiter.api.Test;
import vn.wedding.invitation.imports.ImportService;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ImportCsvTest {
    @Test void parsesQuotedVietnameseFieldsAndLineBreaks() {
        var rows=ImportService.parse("externalRef,displayName,salutation,groupName,eventCodes,maxPeople\n"+
            "KH-01,\"Gia đình cô Hoa, nhánh 1\",Kính mời,Gia đình,E-01;E-02,3;2\n");
        assertEquals(2,rows.size());
        assertEquals("Gia đình cô Hoa, nhánh 1",rows.get(1).get(1));
        assertEquals("E-01;E-02",rows.get(1).get(4));
    }
    @Test void supportsEscapedQuotesAndIgnoresBlankLines() {
        var rows=ImportService.parse("a,b\n\"Gia đình \"\"Hoa\"\"\",x\n\n");
        assertEquals(List.of("Gia đình \"Hoa\"","x"),rows.get(1));
    }
    @Test void rejectsUnclosedQuotes() {
        assertThrows(IllegalArgumentException.class,()->ImportService.parse("a,b\n\"chưa đóng,x\n"));
    }
}