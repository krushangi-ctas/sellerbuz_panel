import { ComponentFixture, TestBed } from "@angular/core/testing";

import { AuthorizationWorkflowComponent } from "./authorization-workflow.component";

describe("AuthorizationWorkflowComponent", () => {
  let component: AuthorizationWorkflowComponent;
  let fixture: ComponentFixture<AuthorizationWorkflowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AuthorizationWorkflowComponent],
    });
    fixture = TestBed.createComponent(AuthorizationWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
