package vn.wedding.invitation;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.wedding.SectionService;
import static org.junit.jupiter.api.Assertions.*;

class SectionValidationTest {
    SectionService.Input input(SectionService.Section...sections){return new SectionService.Input(List.of(sections),1,1,0);}
    SectionService.Section section(String kind,Instant time){return new SectionService.Section(kind,"PRIVATE",true,"Tiêu đề","Nội dung",time,null);}
    @Test void acceptsEmptyAndExplicitContent(){assertDoesNotThrow(()->SectionService.validate(input()));assertDoesNotThrow(()->SectionService.validate(input(section("FAMILY",null))));}
    @Test void rejectsUnknownKindsAndSchema(){assertThrows(RuntimeException.class,()->SectionService.validate(input(section("HTML",null))));assertThrows(RuntimeException.class,()->SectionService.validate(new SectionService.Input(List.of(),2,1,0)));}
    @Test void timelineNeedsTimeAndNoDuplicateEnabledMoments(){assertThrows(RuntimeException.class,()->SectionService.validate(input(section("TIMELINE",null))));var s=section("TIMELINE",Instant.now());assertThrows(RuntimeException.class,()->SectionService.validate(input(s,s)));}
    @Test void rejectsInvalidAudienceColorAndEmptyDressInstructions(){assertThrows(RuntimeException.class,()->SectionService.validate(input(new SectionService.Section("INTRO","ALL",true,"Tên","Nội dung",null,null))));assertThrows(RuntimeException.class,()->SectionService.validate(input(new SectionService.Section("DRESS_CODE","PUBLIC",true,"Trang phục","",null,"red"))));}
}