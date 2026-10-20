package vn.wedding.invitation;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.wedding.SectionService;
import static org.junit.jupiter.api.Assertions.*;

class SectionValidationTest {
    static Map<String,Object> map(Object... entries){
        var result=new LinkedHashMap<String,Object>();
        for(int i=0;i+1<entries.length;i+=2) result.put((String)entries[i],entries[i+1]);
        return result;
    }
    SectionService.Input input(SectionService.Section...sections){return new SectionService.Input(List.of(sections),1,1,0);}
    SectionService.Input structured(SectionService.Section...sections){return new SectionService.Input(List.of(sections),1,2,0);}
    SectionService.Section section(String kind,Instant time){return new SectionService.Section(kind,"PRIVATE",true,"Tiêu đề","Nội dung",time,null,null);}
    SectionService.Section payloadSection(String kind,Map<String,Object> payload){return new SectionService.Section(kind,"PRIVATE",true,"Tiêu đề","Nội dung",null,null,payload);}

    @Test void acceptsEmptyAndExplicitContent(){assertDoesNotThrow(()->SectionService.validate(input()));assertDoesNotThrow(()->SectionService.validate(input(section("FAMILY",null))));}
    @Test void rejectsUnknownKindsAndSchema(){
        assertThrows(RuntimeException.class,()->SectionService.validate(input(section("HTML",null))));
        assertThrows(RuntimeException.class,()->SectionService.validate(new SectionService.Input(List.of(),2,1,0)));
        assertThrows(RuntimeException.class,()->SectionService.validate(new SectionService.Input(List.of(),1,3,0)));
    }
    @Test void rejectsStructuredPayloadUnderSchemaVersionOne(){assertThrows(RuntimeException.class,()->SectionService.validate(input(payloadSection("INTRO",map("people",List.of(map("name","An")))))));}
    @Test void timelineNeedsTimeAndNoDuplicateEnabledMoments(){
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("TIMELINE",Map.of()))));
        var time=section("TIMELINE",Instant.now());
        assertThrows(RuntimeException.class,()->SectionService.validate(input(time,time)));
    }
    @Test void rejectsInvalidAudienceColorAndEmptyDressInstructions(){
        assertThrows(RuntimeException.class,()->SectionService.validate(input(new SectionService.Section("INTRO","ALL",true,"Tên","Nội dung",null,null,null))));
        assertThrows(RuntimeException.class,()->SectionService.validate(input(new SectionService.Section("DRESS_CODE","PUBLIC",true,"Trang phục","",null,"red",null))));
    }

    /* ---------- payload có cấu trúc (content schema 2) ---------- */

    @Test void acceptsStructuredPayloadForEachKind(){
        var person=map("name","Trần Thị Thu Hà","role","Cô dâu","note","Mê hoa dại");
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("INTRO",map("people",List.of(person))))));
        var member=map("name","Bà Nguyễn Thị Hoa","note","Mẹ");
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("FAMILY",map("groups",List.of(map("label","Nhà gái","members",List.of(member))))))));
        var ceremony=map("title","Lễ gia tiên","lead","Kính mời gia đình","time","2026-12-24T01:23:00Z","venue","Tư gia","address","Số 1");
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("CEREMONY",map("items",List.of(ceremony))))));
        var timeline=List.of(map("at","2026-12-24T01:23:00Z","title","Đón khách","audience","PUBLIC"),map("at","2026-12-24T03:00:00Z","title","Khai tiệc","audience","PRIVATE","tentative",true));
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",timeline)))));
        var palette=List.of(map("name","Trắng ngà","color","#fffdf9"));
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("DRESS_CODE",map("palette",palette,"avoid","Hạn chế màu quá tối")))));
    }
    @Test void rejectsOutOfRangeCountsAndUnknownColour(){
        var five=List.of(map("name","a"),map("name","b"),map("name","c"),map("name","d"),map("name","e"));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("INTRO",map("people",five)))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("DRESS_CODE",map("palette",List.of(map("name","Đỏ","color","red")))))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("DRESS_CODE",map("palette",List.of(map("name","","color","#ff5c5c")))))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("FAMILY",map("groups",List.of(map("members",List.of(map()))))))));
    }
    @Test void timelinePayloadReplacesLegacyStartsAtButStillChecksDuplicates(){
        assertDoesNotThrow(()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",List.of(map("at","2026-12-24T01:23:00Z","title","Đón khách")))))));
        var duplicate=List.of(map("at","2026-12-24T01:23:00Z","title","A"),map("at","2026-12-24T01:23:00Z","title","B"));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",duplicate)))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",List.of(map("title","Thiếu giờ")))))));
    }
    @Test void rejectsInvalidMilestoneAudienceAndInstant(){
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",List.of(map("at","2026-12-24T01:23:00Z","title","A","audience","ALL")))))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("TIMELINE",map("timeline",List.of(map("at","mai","title","A")))))));
        assertThrows(RuntimeException.class,()->SectionService.validate(structured(payloadSection("CEREMONY",map("items",List.of(map("title","Lễ","time","sáng")))))));
    }
    /** Whitelist: khoá lạ không được ghi xuống DB, tên được chuẩn hoá khoảng trắng. */
    @Test void normalizationKeepsKnownFieldsOnly(){
        var person=map("name"," An ","role","Cô dâu","secret","token");
        var normalized=SectionService.normalized("INTRO",map("people",List.of(person),"extra",true));
        var people=(List<?>)normalized.get("people");
        assertEquals(1,people.size());
        assertFalse(normalized.containsKey("extra"));
        var first=(Map<?,?>)people.get(0);
        assertFalse(first.containsKey("secret"));
        assertEquals("An",first.get("name"));
        assertNull(SectionService.normalized("INTRO",Map.of()));
    }
}